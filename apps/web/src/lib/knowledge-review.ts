import { z } from "zod";

const severitySchema = z.preprocess(
  (value) => {
    const normalized = String(value ?? "").toLowerCase();
    return ["low", "medium", "high"].includes(normalized) ? normalized : "medium";
  },
  z.enum(["low", "medium", "high"])
);

export const ReviewPayloadSchema = z.object({
  verdict: z.enum(["safe", "caution", "block"]),
  summary: z.string().trim().min(1).max(4_000),
  risks: z
    .array(
      z.object({
        severity: severitySchema,
        file: z.preprocess(
          (value) => (value == null ? undefined : String(value).slice(0, 300)),
          z.string().trim().optional()
        ),
        issue: z.string().trim().min(1).max(1_500),
      })
    )
    .max(30)
    .catch([]),
  checklist: z.array(z.string().trim().min(1).max(500)).max(30).catch([]),
});

export type ReviewPayload = z.infer<typeof ReviewPayloadSchema>;

/** Parse and sanitise the model's JSON review without trusting its shape. */
export function parseReviewPayload(value: unknown): ReviewPayload | null {
  const parsed = ReviewPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
