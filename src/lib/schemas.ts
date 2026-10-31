import { z } from "zod";
import type { BudgetAllocations, Occasion } from "./budget";
import type { Task } from "./timeline";

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

// -------------------------------------------------------------
// Celebration Plan Schemas
// -------------------------------------------------------------

export function isValidDateOnly(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [y, m, d] = val.split("-").map(Number);
  if (!y || !m || !d) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() + 1 === m &&
    date.getUTCDate() === d
  );
}

function getUTCTodayString(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const occasionSchema = z.enum([
  "wedding",
  "birthday",
  "engagement",
  "community",
]);

/**
 * Creates a PlanInput schema with an optional reference 'today' date string.
 * Defaults reference date to current UTC date.
 */
export function createPlanInputSchema(referenceToday: string = getUTCTodayString()) {
  return z.object({
    occasion: occasionSchema,
    eventDate: z
      .string()
      .trim()
      .refine(
        (val) => isValidDateOnly(val) && val > referenceToday,
        {
          message: `eventDate must be a valid YYYY-MM-DD date strictly after ${referenceToday}`,
        }
      ),
    city: z.string().trim().min(1, "City is required"),
    guests: z
      .number()
      .int("Guests must be a whole number")
      .min(1, "Guests must be at least 1")
      .max(5000, "Guests cannot exceed 5000"),
    budget: z
      .number()
      .int("Budget must be a whole number")
      .positive("Budget must be a positive integer"),
    atmosphere: z
      .string()
      .trim()
      .max(100, "Atmosphere must be at most 100 characters")
      .default(""),
    mustHaves: z
      .array(
        z
          .string()
          .trim()
          .max(80, "Each must-have item must be at most 80 characters")
      )
      .max(10, "At most 10 must-have items")
      .default([]),
    dietary: z
      .string()
      .trim()
      .max(100, "Dietary notes must be at most 100 characters")
      .default(""),
    accessibilityNeeds: z
      .string()
      .trim()
      .max(150, "Accessibility needs must be at most 150 characters")
      .default(""),
  });
}

export const planInputSchema = createPlanInputSchema();

export type PlanInput = z.infer<typeof planInputSchema>;

export const vendorChecklistItemSchema = z.object({
  label: z.string(),
  done: z.boolean(),
});

export type VendorChecklistItem = z.infer<typeof vendorChecklistItemSchema>;

export const vendorChecklistSchema = z.object({
  vendor: z.string(),
  items: z.array(vendorChecklistItemSchema),
});

export type VendorChecklist = z.infer<typeof vendorChecklistSchema>;

export const budgetAllocationsSchema = z.object({
  venue: z.number().int().nonnegative(),
  catering: z.number().int().nonnegative(),
  decor: z.number().int().nonnegative(),
  photography: z.number().int().nonnegative(),
  entertainment: z.number().int().nonnegative(),
  contingency: z.number().int().nonnegative(),
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  dependsOn: z.array(z.string()),
  offsetDaysBeforeEvent: z.number(),
  dueDate: z.string(),
  status: z.enum(["todo", "done"]),
  compressed: z.boolean(),
});

export const planSchema = z.object({
  source: z.enum(["ai", "fallback"]),
  input: planInputSchema,
  budget: budgetAllocationsSchema,
  timeline: z.array(taskSchema),
  vendorChecklist: z.array(vendorChecklistSchema),
  ideas: z.array(z.string()),
  notes: z.array(z.string()),
  modelUsed: z.string().optional(),
  fallbackReason: z.enum(["no_api_key", "all_models_failed"]).optional(),
});

export type Plan = {
  source: "ai" | "fallback";
  input: PlanInput;
  budget: BudgetAllocations;
  timeline: Task[];
  vendorChecklist: { vendor: string; items: { label: string; done: boolean }[] }[];
  ideas: string[];
  notes: string[];
  modelUsed?: string;
  fallbackReason?: "no_api_key" | "all_models_failed";
};

// -------------------------------------------------------------
// Route API Request Schemas
// -------------------------------------------------------------

export const planApiRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("plan"),
    input: planInputSchema,
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  z.object({
    mode: z.literal("chat"),
    plan: z.any(),
    question: z
      .string()
      .trim()
      .min(1, "Question cannot be empty")
      .max(500, "Question is too long"),
  }),
]);

export type PlanApiRequest = z.infer<typeof planApiRequestSchema>;
