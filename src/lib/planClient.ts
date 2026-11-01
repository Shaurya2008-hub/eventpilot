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

export interface RequestChatOptions {
  timeoutMs?: number;
}

export const DEFAULT_CHAT_ERROR_MESSAGE =
  "I'm having a little trouble connecting right now. Please try asking again in a moment, or check your connection.";

export interface SendChatMessageHandlers {
  onUserMessage: (content: string) => void;
  onAssistantMessage: (content: string, isError?: boolean) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * High-level orchestration for submitting a chat message:
 * 1. Appends user message
 * 2. Sets loading state to true
 * 3. Queries /api/gemini chat endpoint with 10s ceiling
 * 4. Appends assistant response or graceful inline error
 * 5. Clears loading state
 */
export async function processChatSubmission(
  plan: Plan,
  question: string,
  handlers: SendChatMessageHandlers,
  options?: RequestChatOptions
): Promise<boolean> {
  const query = question.trim();
  if (!query) return false;

  handlers.onUserMessage(query);
  handlers.setLoading(true);

  try {
    const answer = await requestChatAnswer(plan, query, options);
    handlers.onAssistantMessage(answer, false);
    return true;
  } catch {
    handlers.onAssistantMessage(DEFAULT_CHAT_ERROR_MESSAGE, true);
    return false;
  } finally {
    handlers.setLoading(false);
  }
}

/**
 * Requests an answer to a question about the plan from /api/gemini (mode: "chat")
 * with a 10s default timeout.
 *
 * @param plan - Current Plan object.
 * @param question - User's question text.
 * @param options - Optional timeout configuration.
 * @returns AI or local fallback answer string.
 * @throws Error if network fails, times out, or returns a non-200 response.
 */
export async function requestChatAnswer(
  plan: Plan,
  question: string,
  options?: RequestChatOptions
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "chat",
        plan,
        question: question.trim(),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Chat request failed with status ${res.status}`);
    }

    const data: unknown = await res.json();
    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      (data as { success: boolean }).success &&
      "answer" in data &&
      typeof (data as { answer: string }).answer === "string"
    ) {
      return (data as { answer: string }).answer;
    }

    throw new Error("Invalid response format received from chat endpoint");
  } finally {
    clearTimeout(timeoutId);
  }
}


