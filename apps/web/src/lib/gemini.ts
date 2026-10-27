const DEFAULT_MODEL = "gemini-2.5-flash";

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export interface GeminiOptions {
  system?: string;
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Minimal Gemini client (REST). We deliberately avoid a heavy agent framework:
 * the knowledge base needs one prompt in, one answer out.
 */
export async function askGemini(prompt: string, options: GeminiOptions = {}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "AI is not configured. Set GEMINI_API_KEY in the environment to enable the knowledge base."
    );
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
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

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p?.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text;
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
