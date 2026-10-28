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

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

function retryDelay(attempt: number): number {
  const configured = Number(process.env.GEMINI_RETRY_BASE_MS);
  const base = Number.isFinite(configured) && configured >= 0 ? configured : 700;
  const jitter = base === 0 ? 0 : Math.floor(Math.random() * 200);
  return base * 2 ** attempt + jitter;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function friendlyFailure(status: number): string {
  if (status === 429) {
    return "Gemini is rate-limiting requests right now. Wait a few seconds and try again.";
  }
  if (status === 503) {
    return "Gemini is temporarily overloaded. Try again in a few seconds.";
  }
  return `Gemini request failed (${status}). Try again shortly.`;
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
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const result = await callModel(model, prompt, options, key);
      if (result.ok) return result.text;

      last = result;

      if (result.status === 404) {
        // Model retired: follow the suggested replacement, then move on.
        const suggested = /models\/([A-Za-z0-9._-]+)/.exec(result.body)?.[1];
        if (suggested && !models.includes(suggested)) {
          models.push(suggested);
        }
        break;
      }

      if (!RETRYABLE_STATUSES.has(result.status)) {
        break;
      }

      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(retryDelay(attempt));
      }
    }
  }

  const status = last?.status ?? 502;
  console.error(
    `Gemini failed after retries (${status}):`,
    (last?.body ?? "").slice(0, 300)
  );
  throw new Error(friendlyFailure(status));
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
