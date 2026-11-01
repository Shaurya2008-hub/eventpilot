import { describe, it, expect, beforeEach } from "vitest";
import {
  applyWhatIf,
  buildExplanation,
  buildChangeSummary,
} from "@/lib/whatIf";
import { generateFallbackPlan } from "@/lib/fallbackPlanner";
import { BUDGET_CATEGORIES } from "@/lib/budget";
import { usePlanStore } from "@/store/plan-store";
import type { Plan } from "@/lib/schemas";

function createBasePlan(): Plan {
  return generateFallbackPlan(
    {
      occasion: "wedding",
      eventDate: "2026-12-31",
      city: "Jaipur",
      guests: 200,
      budget: 1000000,
      atmosphere: "Royal Traditional",
      mustHaves: ["Live Shehnai", "Floral Mandap"],
      dietary: "Pure Vegetarian",
      accessibilityNeeds: "Ramps for senior citizens",
    },
    "2026-11-01"
  );
}

describe("What If? Scenario Planning Pure Module", () => {
  const TODAY = "2026-11-01";

  describe("Explanation text for each change type", () => {
    it("generates budget-change explanation with category deltas", () => {
      const before = createBasePlan();
      const result = applyWhatIf(before, { newBudget: 1050000 }, TODAY);

      expect(result.error).toBeUndefined();
      expect(result.explanation).toContain("Budget +₹50,000");
      // Check that category deltas are mentioned
      expect(result.explanation).toMatch(/Catering|Venue|Decor/);
    });

    it("generates guest-change explanation", () => {
      const before = createBasePlan();
      const result = applyWhatIf(before, { newGuests: 300 }, TODAY);

      expect(result.error).toBeUndefined();
      expect(result.explanation).toContain("Guests +100");
    });

    it("generates date-change explanation mentioning task movements", () => {
      const before = createBasePlan();
      const result = applyWhatIf(before, { newEventDate: "2027-01-20" }, TODAY);

      expect(result.error).toBeUndefined();
      expect(result.explanation).toMatch(/\d+ tasks moved later/);
    });

    it("generates combined multi-factor change explanation", () => {
      const before = createBasePlan();
      const result = applyWhatIf(
        before,
        {
          newBudget: 1200000,
          newGuests: 350,
          newEventDate: "2027-01-15",
        },
        TODAY
      );

      expect(result.error).toBeUndefined();
      expect(result.explanation).toContain("Budget +₹2,00,000");
      expect(result.explanation).toContain("Guests +150");
      expect(result.explanation).toMatch(/tasks moved later/);
    });

    it("returns 'No changes detected' when no changes are made", () => {
      const before = createBasePlan();
      const explanation = buildExplanation(before, before);
      expect(explanation).toBe("No changes detected");
    });
  });

  describe("Exact budget sums after budget and guest changes", () => {
    it("maintains exact rupee sum invariant after total budget change", () => {
      const before = createBasePlan();
      const targetBudget = 1456789;

      const result = applyWhatIf(before, { newBudget: targetBudget }, TODAY);
      expect(result.error).toBeUndefined();

      const sum = BUDGET_CATEGORIES.reduce(
        (acc, cat) => acc + result.plan.budget[cat],
        0
      );
      expect(sum).toBe(targetBudget);
      expect(result.plan.input.budget).toBe(targetBudget);

      for (const cat of BUDGET_CATEGORIES) {
        expect(Number.isInteger(result.plan.budget[cat])).toBe(true);
        expect(result.plan.budget[cat]).toBeGreaterThanOrEqual(0);
      }
    });

    it("maintains exact rupee sum invariant after guest count changes", () => {
      const before = createBasePlan();
      const initialBudget = before.input.budget;

      // Higher guest count should increase catering proportion
      const increasedGuests = applyWhatIf(before, { newGuests: 500 }, TODAY);
      expect(increasedGuests.error).toBeUndefined();

      const sumIncreased = BUDGET_CATEGORIES.reduce(
        (acc, cat) => acc + increasedGuests.plan.budget[cat],
        0
      );
      expect(sumIncreased).toBe(initialBudget);
      expect(increasedGuests.plan.budget.catering).toBeGreaterThan(
        before.budget.catering
      );

      // Lower guest count should decrease catering proportion
      const decreasedGuests = applyWhatIf(before, { newGuests: 50 }, TODAY);
      expect(decreasedGuests.error).toBeUndefined();

      const sumDecreased = BUDGET_CATEGORIES.reduce(
        (acc, cat) => acc + decreasedGuests.plan.budget[cat],
        0
      );
      expect(sumDecreased).toBe(initialBudget);
      expect(decreasedGuests.plan.budget.catering).toBeLessThan(
        before.budget.catering
      );
    });

    it("maintains exact rupee sum when both budget and guests change", () => {
      const before = createBasePlan();
      const targetBudget = 850000;

      const result = applyWhatIf(
        before,
        { newBudget: targetBudget, newGuests: 400 },
        TODAY
      );
      expect(result.error).toBeUndefined();

      const sum = BUDGET_CATEGORIES.reduce(
        (acc, cat) => acc + result.plan.budget[cat],
        0
      );
      expect(sum).toBe(targetBudget);
      expect(result.plan.input.budget).toBe(targetBudget);
      expect(result.plan.input.guests).toBe(400);
    });
  });

  describe("Done tasks preserved after date change", () => {
    it("preserves done task status and due date when event date changes", () => {
      const before = createBasePlan();
      // Mark task 0 as done
      before.timeline[0].status = "done";
      const originalTask0DueDate = before.timeline[0].dueDate;
      const originalTask1DueDate = before.timeline[1].dueDate;

      // Push event 14 days later
      const result = applyWhatIf(
        before,
        { newEventDate: "2027-01-14" },
        TODAY
      );
      expect(result.error).toBeUndefined();

      const task0 = result.plan.timeline.find((t) => t.id === before.timeline[0].id)!;
      const task1 = result.plan.timeline.find((t) => t.id === before.timeline[1].id)!;

      // Done task never moves
      expect(task0.status).toBe("done");
      expect(task0.dueDate).toBe(originalTask0DueDate);

      // Non-done task moves
      expect(task1.status).toBe("todo");
      expect(task1.dueDate).not.toBe(originalTask1DueDate);
    });
  });

  describe("Past date rejected", () => {
    it("rejects date in the past relative to today with an error message", () => {
      const before = createBasePlan();
      const result = applyWhatIf(before, { newEventDate: "2025-01-01" }, TODAY);

      expect(result.error).toBeDefined();
      expect(result.error).toContain("must be after today");
      // Plan remains unchanged
      expect(result.plan.input.eventDate).toBe(before.input.eventDate);
    });

    it("rejects today's date as event date", () => {
      const before = createBasePlan();
      const result = applyWhatIf(before, { newEventDate: TODAY }, TODAY);

      expect(result.error).toBeDefined();
      expect(result.error).toContain("must be after today");
    });
  });

  describe("Badge and metadata preservation", () => {
    it("keeps AI badge, model name, and vendor checklist intact", () => {
      const before = createBasePlan();
      before.source = "ai";
      before.modelUsed = "gemini-3.8-flash";
      before.vendorChecklist[0].items[0].done = true;

      const result = applyWhatIf(
        before,
        { newBudget: 1100000, newGuests: 250 },
        TODAY
      );

      expect(result.plan.source).toBe("ai");
      expect(result.plan.modelUsed).toBe("gemini-3.8-flash");
      expect(result.plan.vendorChecklist[0].items[0].done).toBe(true);
    });
  });

  describe("buildChangeSummary helper", () => {
    it("generates a concise text summary of changes for Gemini prompt", () => {
      const before = createBasePlan();
      const after = applyWhatIf(before, { newBudget: 1100000, newGuests: 250 }, TODAY).plan;
      const summary = buildChangeSummary(before, after);

      expect(summary).toContain("Total budget changed");
      expect(summary).toContain("Guest count changed");
    });
  });
});

describe("What If? Store Integration and Undo", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  it("applies what-if change and allows undo to restore previous plan exactly", () => {
    const initialPlan = createBasePlan();
    usePlanStore.getState().setPlan(initialPlan);

    const storeBefore = usePlanStore.getState();
    expect(storeBefore.plan?.input.budget).toBe(1000000);
    expect(storeBefore.previousPlan).toBeNull();

    // Apply What If change
    const result = usePlanStore.getState().applyWhatIfChange(
      {
        newBudget: 1500000,
        newGuests: 350,
      },
      "2026-11-01"
    );

    expect(result.error).toBeUndefined();
    expect(usePlanStore.getState().plan?.input.budget).toBe(1500000);
    expect(usePlanStore.getState().plan?.input.guests).toBe(350);
    expect(usePlanStore.getState().previousPlan).not.toBeNull();
    expect(usePlanStore.getState().previousPlan?.input.budget).toBe(1000000);

    // Perform Undo
    const undoSuccess = usePlanStore.getState().undoWhatIf();
    expect(undoSuccess).toBe(true);

    const storeAfterUndo = usePlanStore.getState();
    expect(storeAfterUndo.plan?.input.budget).toBe(1000000);
    expect(storeAfterUndo.plan?.input.guests).toBe(200);
    expect(storeAfterUndo.previousPlan).toBeNull();
  });
});
