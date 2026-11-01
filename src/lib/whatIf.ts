import {
  allocateByWeights,
  BUDGET_CATEGORIES,
  type BudgetCategory,
} from "./budget";
import { reflow, TimelineError, diffDays } from "./timeline";
import type { Plan } from "./schemas";

// ── Types ────────────────────────────────────────────────────────

export interface WhatIfInputs {
  newBudget?: number;
  newGuests?: number;
  newEventDate?: string;
}

export interface WhatIfResult {
  plan: Plan;
  explanation: string;
  error?: string;
}

// ── Category display names (kept local — only used for explanation text) ──

const CAT_LABELS: Record<BudgetCategory, string> = {
  venue: "Venue",
  catering: "Catering",
  decor: "Decor",
  photography: "Photography",
  entertainment: "Entertainment",
  contingency: "Contingency",
};

// ── Helpers ──────────────────────────────────────────────────────

function formatRupees(n: number): string {
  const prefix = n >= 0 ? "+" : "";
  return `${prefix}₹${Math.abs(n).toLocaleString("en-IN")}`;
}

// ── buildExplanation ─────────────────────────────────────────────

/**
 * Generates a short plain-English summary from numeric differences between plans.
 * @param before - Plan state before what-if scenario.
 * @param after - Plan state after what-if adjustments.
 * @returns Formatted summary string of changes.
 */
export function buildExplanation(before: Plan, after: Plan): string {
  const parts: string[] = [];

  // Budget total change
  const budgetDelta = after.input.budget - before.input.budget;
  if (budgetDelta !== 0) {
    const catChanges: string[] = [];
    for (const cat of BUDGET_CATEGORIES) {
      const diff = after.budget[cat] - before.budget[cat];
      if (diff !== 0) {
        catChanges.push(`${CAT_LABELS[cat]} ${formatRupees(diff)}`);
      }
    }

    let budgetPart = `Budget ${formatRupees(budgetDelta)}`;
    if (catChanges.length > 0) {
      budgetPart += `: ${catChanges.join(", ")}`;
    }
    parts.push(budgetPart);
  } else {
    // Even if total didn't change, allocations might have shifted (guest change)
    const catChanges: string[] = [];
    for (const cat of BUDGET_CATEGORIES) {
      const diff = after.budget[cat] - before.budget[cat];
      if (diff !== 0) {
        catChanges.push(`${CAT_LABELS[cat]} ${formatRupees(diff)}`);
      }
    }
    if (catChanges.length > 0) {
      parts.push(`Allocations shifted: ${catChanges.join(", ")}`);
    }
  }

  // Guest change
  const guestDelta = after.input.guests - before.input.guests;
  if (guestDelta !== 0) {
    const prefix = guestDelta > 0 ? "+" : "";
    parts.push(`Guests ${prefix}${guestDelta}`);
  }

  // Timeline changes
  const oldDates = new Map(before.timeline.map((t) => [t.id, t.dueDate]));
  let movedCount = 0;
  let direction: "earlier" | "later" | "mixed" | "" = "";

  for (const task of after.timeline) {
    const oldDate = oldDates.get(task.id);
    if (oldDate && oldDate !== task.dueDate) {
      movedCount++;
      const daysDiff = diffDays(task.dueDate, oldDate);
      if (daysDiff > 0) {
        direction = direction === "" ? "later" : direction === "later" ? "later" : "mixed";
      } else {
        direction = direction === "" ? "earlier" : direction === "earlier" ? "earlier" : "mixed";
      }
    }
  }

  if (movedCount > 0) {
    const taskWord = movedCount === 1 ? "task" : "tasks";
    const suffix = direction && direction !== "mixed" ? ` ${direction}` : "";
    parts.push(`${movedCount} ${taskWord} moved${suffix}`);
  }

  if (parts.length === 0) {
    return "No changes detected";
  }

  return parts.join("; ");
}

// ── applyWhatIf ──────────────────────────────────────────────────

/**
 * Applies what-if scenario changes to a plan using exact integer arithmetic.
 * @param plan - Original celebration plan.
 * @param inputs - Requested scenario changes (budget, guests, eventDate).
 * @param today - Current reference date string (YYYY-MM-DD).
 * @returns Object with updated Plan, explanation, and optional error.
 */
export function applyWhatIf(
  plan: Plan,
  inputs: WhatIfInputs,
  today: string
): WhatIfResult {
  const working: Plan = {
    ...plan,
    input: { ...plan.input },
    budget: { ...plan.budget },
    timeline: plan.timeline.map((t) => ({ ...t, dependsOn: [...t.dependsOn] })),
    vendorChecklist: plan.vendorChecklist.map((v) => ({
      ...v,
      items: v.items.map((i) => ({ ...i })),
    })),
    ideas: [...plan.ideas],
    notes: [...plan.notes],
  };

  // Track which original budget/originalBudget to keep
  const preservedOriginalBudget = plan.originalBudget
    ? { ...plan.originalBudget }
    : { ...plan.budget };

  // ── Apply budget change ──
  if (inputs.newBudget !== undefined && inputs.newBudget !== plan.input.budget) {
    const newTotal = inputs.newBudget;

    if (!Number.isInteger(newTotal) || newTotal <= 0) {
      return {
        plan,
        explanation: "",
        error: "Budget must be a positive integer",
      };
    }

    // Use current allocations as weights → allocateByWeights guarantees
    // integer rupees summing exactly to newTotal
    const newAllocations = allocateByWeights(newTotal, plan.budget);
    working.budget = newAllocations;
    working.input = { ...working.input, budget: newTotal };
  }

  // ── Apply guest-count change ──
  if (inputs.newGuests !== undefined && inputs.newGuests !== plan.input.guests) {
    const newGuests = inputs.newGuests;

    if (!Number.isInteger(newGuests) || newGuests < 1 || newGuests > 5000) {
      return {
        plan,
        explanation: "",
        error: "Guest count must be an integer between 1 and 5,000",
      };
    }

    const oldGuests = plan.input.guests;
    const guestRatio = newGuests / Math.max(1, oldGuests);

    // Shift catering weight proportionally to guest-count change
    const adjustedWeights: Record<BudgetCategory, number> = {
      venue: working.budget.venue,
      catering: Math.max(1, Math.round(working.budget.catering * guestRatio)),
      decor: working.budget.decor,
      photography: working.budget.photography,
      entertainment: working.budget.entertainment,
      contingency: working.budget.contingency,
    };

    const totalForAllocation = working.input.budget;
    working.budget = allocateByWeights(totalForAllocation, adjustedWeights);
    working.input = { ...working.input, guests: newGuests };
  }

  // ── Apply event-date change ──
  if (inputs.newEventDate !== undefined && inputs.newEventDate !== plan.input.eventDate) {
    const newDate = inputs.newEventDate;

    // Reject past dates
    try {
      const daysFromToday = diffDays(newDate, today);
      if (daysFromToday <= 0) {
        return {
          plan,
          explanation: "",
          error: `Event date must be after today (${today})`,
        };
      }
    } catch {
      return {
        plan,
        explanation: "",
        error: `Invalid date format: "${newDate}"`,
      };
    }

    try {
      const reflowed = reflow(working.timeline, {
        newEventDate: newDate,
        eventDate: working.input.eventDate,
      });
      working.timeline = reflowed;
      working.input = { ...working.input, eventDate: newDate };
    } catch (err) {
      const msg =
        err instanceof TimelineError || err instanceof Error
          ? err.message
          : "Failed to adjust timeline dates";
      return {
        plan,
        explanation: "",
        error: msg,
      };
    }
  }

  // Preserve original budget, source badge, and modelUsed
  working.originalBudget = preservedOriginalBudget;

  const explanation = buildExplanation(plan, working);

  return {
    plan: working,
    explanation,
  };
}

// ── AI explanation enhancement ──────────────────────────────────

/**
 * Builds a compact change summary string suitable for trade-off explanation prompts.
 * @param before - Plan state prior to change.
 * @param after - Plan state after adjustments.
 * @returns Human-readable change summary sentence.
 */
export function buildChangeSummary(before: Plan, after: Plan): string {
  const lines: string[] = [];

  if (before.input.budget !== after.input.budget) {
    lines.push(
      `Total budget changed from ₹${before.input.budget.toLocaleString("en-IN")} to ₹${after.input.budget.toLocaleString("en-IN")}.`
    );
  }

  if (before.input.guests !== after.input.guests) {
    lines.push(
      `Guest count changed from ${before.input.guests} to ${after.input.guests}.`
    );
  }

  if (before.input.eventDate !== after.input.eventDate) {
    lines.push(
      `Event date changed from ${before.input.eventDate} to ${after.input.eventDate}.`
    );
  }

  for (const cat of BUDGET_CATEGORIES) {
    const diff = after.budget[cat] - before.budget[cat];
    if (diff !== 0) {
      lines.push(
        `${CAT_LABELS[cat]}: ₹${before.budget[cat].toLocaleString("en-IN")} → ₹${after.budget[cat].toLocaleString("en-IN")} (${formatRupees(diff)})`
      );
    }
  }

  const oldDates = new Map(before.timeline.map((t) => [t.id, t.dueDate]));
  const movedTasks: string[] = [];
  for (const task of after.timeline) {
    const oldDate = oldDates.get(task.id);
    if (oldDate && oldDate !== task.dueDate) {
      movedTasks.push(`"${task.title}" ${oldDate} → ${task.dueDate}`);
    }
  }
  if (movedTasks.length > 0) {
    lines.push(`Timeline shifts: ${movedTasks.join("; ")}`);
  }

  return lines.join(" ");
}

/**
 * Fetches an AI-enhanced explanation from the chat endpoint with a 10s timeout.
 * @param plan - Celebration plan context.
 * @param changeSummary - Summary of changes made.
 * @returns Explanation string or null on failure.
 */
export async function fetchAiExplanation(
  plan: Plan,
  changeSummary: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "chat",
        plan,
        question: `The user just made these changes to their celebration plan: ${changeSummary}\n\nIn 2-3 sentences, explain the practical trade-offs of these changes for an Indian family celebration. Be warm, specific, and helpful. Do not repeat the numbers.`,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      (data as { success: boolean }).success &&
      "answer" in data &&
      typeof (data as { answer: string }).answer === "string"
    ) {
      const answer = (data as { answer: string }).answer.trim();
      return answer || null;
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
