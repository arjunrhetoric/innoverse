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
  delete process.env.GEMINI_RETRY_BASE_MS;
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

  it("retries transient 503s with backoff", async () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    process.env.GEMINI_RETRY_BASE_MS = "0";

    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls += 1;
      if (calls < 3) {
        return jsonResponse(
          { error: { code: 503, message: "high demand", status: "UNAVAILABLE" } },
          503
        );
      }
      return jsonResponse({ candidates: [{ content: { parts: [{ text: "recovered" }] } }] });
    });

    await expect(askGemini("hello")).resolves.toBe("recovered");
    expect(calls).toBe(3);
  });

  it("gives a friendly message when 503s persist", async () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    process.env.GEMINI_RETRY_BASE_MS = "0";

    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls += 1;
      return jsonResponse(
        { error: { code: 503, message: "high demand", status: "UNAVAILABLE" } },
        503
      );
    });

    await expect(askGemini("hello")).rejects.toThrow(/temporarily overloaded/i);
    expect(calls).toBe(3);
  });

  it("does not retry on non-retryable errors", async () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    process.env.GEMINI_RETRY_BASE_MS = "0";

    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(String(url));
      return jsonResponse({ error: { message: "invalid api key" } }, 401);
    });

    await expect(askGemini("hello")).rejects.toThrow(/401/);
    expect(calls).toHaveLength(1);
  });

  it("rejects an empty response", async () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    process.env.GEMINI_RETRY_BASE_MS = "0";

    vi.stubGlobal("fetch", async () => jsonResponse({ candidates: [] }));

    await expect(askGemini("hello")).rejects.toThrow(/502|temporarily/i);
  });
});
