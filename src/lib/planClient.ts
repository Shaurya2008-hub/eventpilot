import { generateFallbackPlan } from "./fallbackPlanner";
import { planSchema, type Plan, type PlanInput } from "./schemas";

export interface RequestPlanOptions {
  timeoutMs?: number;
}

/**
 * Requests a celebration plan from /api/gemini (mode: "plan") with a 35s timeout.
 * If the request fails, times out, or returns invalid data, falls back locally
 * to generateFallbackPlan.
 *
 * @param input - Validated celebration details.
 * @param today - Current local date (YYYY-MM-DD).
 * @param options - Optional timeout configuration (defaults to 35,000 ms).
 * @returns Fully generated Plan object.
 */
export async function requestPlan(
  input: PlanInput,
  today: string,
  options?: RequestPlanOptions
): Promise<Plan> {
  const timeoutMs = options?.timeoutMs ?? 35000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "plan",
        input,
        today,
      }),
      signal: controller.signal,
    });

    if (res.ok) {
      const data: unknown = await res.json();
      if (
        data &&
        typeof data === "object" &&
        "plan" in data &&
        (data as { success?: boolean }).success
      ) {
        const parsed = planSchema.safeParse((data as { plan: unknown }).plan);
        if (parsed.success) {
          return parsed.data;
        }
      }
    }
  } catch {
    // Network error, timeout, or aborted - proceed to local fallback
  } finally {
    clearTimeout(timeoutId);
  }

  // Fallback locally to deterministic offline algorithm
  return generateFallbackPlan(input, today);
}

