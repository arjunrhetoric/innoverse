import { afterEach, describe, expect, it, vi } from "vitest";
import { askGemini, isGeminiConfigured } from "./gemini";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
});

describe("askGemini", () => {
  it("requires an API key", async () => {
    expect(isGeminiConfigured()).toBe(false);
    await expect(askGemini("hello")).rejects.toThrow(/not configured/i);
  });

  it("calls the configured model and returns text", async () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";

    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(String(url));
      return jsonResponse({ candidates: [{ content: { parts: [{ text: "answer" }] } }] });
    });

    await expect(askGemini("hello")).resolves.toBe("answer");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("gemini-3.8-flash");
  });

  it("follows the suggested model when the configured one is retired (404)", async () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";

    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(String(url));
      if (String(url).includes("gemini-2.5-flash")) {
        return jsonResponse(
          {
            error: {
              code: 404,
              message:
                "This model is no longer available. Update your code to use models/gemini-3.8-flash.",
            },
          },
          404
        );
      }
      return jsonResponse({ candidates: [{ content: { parts: [{ text: "fallback answer" }] } }] });
    });

    await expect(askGemini("hello")).resolves.toBe("fallback answer");
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("gemini-3.8-flash");
  });

  it("does not retry on non-404 errors", async () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";

    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(String(url));
      return jsonResponse({ error: { message: "quota exceeded" } }, 429);
    });

    await expect(askGemini("hello")).rejects.toThrow(/429/);
    expect(calls).toHaveLength(1);
  });

  it("rejects an empty response", async () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";

    vi.stubGlobal("fetch", async () => jsonResponse({ candidates: [] }));

    await expect(askGemini("hello")).rejects.toThrow(/empty response/i);
  });
});
