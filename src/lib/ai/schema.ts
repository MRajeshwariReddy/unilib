import "server-only";
import { z } from "zod";

export const aiOutputSegmentSchema = z.object({
  text: z.string().min(1).max(1200),
  citations: z.array(z.number().int().min(1)).min(1).max(4),
  evidence_quote: z.string().min(1).max(300),
});

export const aiOutputSchema = z
  .object({
    answerable: z.boolean(),
    refusal_reason: z.enum(["not_in_document", "off_topic"]).nullable(),
    segments: z.array(aiOutputSegmentSchema).max(12),
  })
  .refine(
    (data) => {
      if (!data.answerable) {
        return data.segments.length === 0 && data.refusal_reason !== null;
      } else {
        return data.segments.length >= 1 && data.refusal_reason === null;
      }
    },
    {
      message:
        "Invalid AI output structure: when answerable=false, segments must be empty and refusal_reason non-null; when answerable=true, segments must contain >=1 item and refusal_reason must be null.",
    }
  );

export type AIOutputRaw = z.infer<typeof aiOutputSchema>;
export type AISegmentRaw = z.infer<typeof aiOutputSegmentSchema>;
