const DEFAULT_MODEL = "gemini-3.8-flash";

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export interface GeminiOptions {
  system?: string;
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

interface CallResult {
  ok: boolean;
  status: number;
  text: string;
  body: string;
}

async function callModel(
  model: string,
  prompt: string,
  options: GeminiOptions,
  key: string
): Promise<CallResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        ...(options.system
          ? { systemInstruction: { parts: [{ text: options.system }] } }
          : {}),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxOutputTokens ?? 2048,
          ...(options.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    }
  );

  const body = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, status: res.status, text: "", body };
  }

  try {
    const data = JSON.parse(body);
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? "")
      .join("")
      .trim();
    if (!text) {
      return { ok: false, status: 502, text: "", body: "Gemini returned an empty response" };
    }
    return { ok: true, status: res.status, text, body };
  } catch {
    return { ok: false, status: 502, text: "", body: "Gemini returned a malformed response" };
  }
}

/**
 * Minimal Gemini client (REST).
 *
 * Model retirement is real: if the configured model is unavailable, the API
 * suggests a replacement in the error body. We follow that suggestion once
 * instead of hard-failing the feature.
 */
export async function askGemini(prompt: string, options: GeminiOptions = {}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "AI is not configured. Set GEMINI_API_KEY in the environment to enable the knowledge base."
    );
  }

  const configured = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const models = [configured, DEFAULT_MODEL].filter(
    (model, index, list) => list.indexOf(model) === index
  );

  let last: CallResult | null = null;

  for (const model of models) {
    const result = await callModel(model, prompt, options, key);
    if (result.ok) return result.text;

    last = result;
    if (result.status !== 404) break;

    // e.g. "Please update your code to use models/gemini-3.8-flash"
    const suggested = /models\/([A-Za-z0-9._-]+)/.exec(result.body)?.[1];
    if (suggested && !models.includes(suggested)) {
      models.push(suggested);
    }
  }

  throw new Error(
    `Gemini request failed (${last?.status ?? "no response"}): ${(last?.body ?? "unknown error").slice(0, 300)}`
  );
}

export function extractJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
