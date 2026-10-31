import { z } from "zod";

/** Schema for the request body sent to POST /api/gemini */
export const geminiRequestSchema = z.object({
  eventName: z
    .string()
    .min(1, "Event name is required")
    .max(120, "Event name is too long"),
  budget: z
    .number()
    .int("Budget must be a whole number")
    .nonnegative("Budget must be non-negative"),
});

export type GeminiRequest = z.infer<typeof geminiRequestSchema>;

/** Schema for the stub response from POST /api/gemini */
export const geminiResponseSchema = z.object({
  success: z.boolean(),
  plan: z.string(),
  model: z.string(),
});

export type GeminiResponse = z.infer<typeof geminiResponseSchema>;

