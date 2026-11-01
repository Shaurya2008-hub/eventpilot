import { describe, it, expect } from "vitest";
import {
  applyBudgetChange,
  resetPlanBudget,
  toggleTaskStatus,
  delayTaskInPlan,
} from "@/lib/planHelpers";
import { generateFallbackPlan } from "@/lib/fallbackPlanner";
import { BUDGET_CATEGORIES, type BudgetCategory } from "@/lib/budget";
import type { Plan } from "@/lib/schemas";

function createTestPlan(): Plan {
  return generateFallbackPlan(
    {
      occasion: "wedding",
      eventDate: "2026-12-15",
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

describe("planHelpers pure module", () => {
  describe("applyBudgetChange", () => {
    it("maintains total sum invariant when slider is set to 0", () => {
      const plan = createTestPlan();
      const totalBudget = plan.input.budget;

      for (const cat of BUDGET_CATEGORIES) {
        const updatedPlan = applyBudgetChange(plan, cat, 0);
        const sum = BUDGET_CATEGORIES.reduce(
          (acc, c) => acc + updatedPlan.budget[c],
          0
        );

        expect(updatedPlan.budget[cat]).toBe(0);
        expect(sum).toBe(totalBudget);
        // All categories non-negative integers
        for (const c of BUDGET_CATEGORIES) {
          expect(Number.isInteger(updatedPlan.budget[c])).toBe(true);
          expect(updatedPlan.budget[c]).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("maintains total sum invariant when slider is set to maximum (totalBudget)", () => {
      const plan = createTestPlan();
      const totalBudget = plan.input.budget;

      for (const cat of BUDGET_CATEGORIES) {
        const updatedPlan = applyBudgetChange(plan, cat, totalBudget);
        const sum = BUDGET_CATEGORIES.reduce(
          (acc, c) => acc + updatedPlan.budget[c],
          0
        );

        expect(updatedPlan.budget[cat]).toBe(totalBudget);
        expect(sum).toBe(totalBudget);

        // All other categories must be 0
        for (const otherCat of BUDGET_CATEGORIES) {
          if (otherCat !== cat) {
            expect(updatedPlan.budget[otherCat]).toBe(0);
          }
        }
      }
    });

    it("clamps values outside [0, totalBudget] and maintains invariant", () => {
      const plan = createTestPlan();
      const totalBudget = plan.input.budget;

      const negativePlan = applyBudgetChange(plan, "venue", -50000);
      expect(negativePlan.budget.venue).toBe(0);
      expect(
        BUDGET_CATEGORIES.reduce((acc, c) => acc + negativePlan.budget[c], 0)
      ).toBe(totalBudget);

      const excessivePlan = applyBudgetChange(plan, "venue", totalBudget + 999999);
      expect(excessivePlan.budget.venue).toBe(totalBudget);
      expect(
        BUDGET_CATEGORIES.reduce((acc, c) => acc + excessivePlan.budget[c], 0)
      ).toBe(totalBudget);
    });

    it("preserves plan.source, modelUsed, and originalBudget on change", () => {
      const plan = createTestPlan();
      plan.source = "ai";
      plan.modelUsed = "gemini-3.8-flash";

      const updated = applyBudgetChange(plan, "catering", 300000);
      expect(updated.source).toBe("ai");
      expect(updated.modelUsed).toBe("gemini-3.8-flash");
      expect(updated.originalBudget).toEqual(plan.originalBudget);
    });
  });

  describe("resetPlanBudget", () => {
    it("restores original budget split after multiple slider adjustments", () => {
      const plan = createTestPlan();
      const originalAllocations = { ...plan.budget };

      let modified = applyBudgetChange(plan, "venue", 800000);
      modified = applyBudgetChange(modified, "catering", 50000);
      modified = applyBudgetChange(modified, "decor", 0);

      expect(modified.budget).not.toEqual(originalAllocations);

      const restored = resetPlanBudget(modified);
      expect(restored.budget).toEqual(originalAllocations);
      expect(restored.source).toBe(plan.source);
    });
  });

  describe("toggleTaskStatus", () => {
    it("toggles task between todo and done", () => {
      const plan = createTestPlan();
      const firstTaskId = plan.timeline[0].id;
      expect(plan.timeline[0].status).toBe("todo");

      const donePlan = toggleTaskStatus(plan, firstTaskId);
      expect(donePlan.timeline[0].status).toBe("done");

      const todoPlan = toggleTaskStatus(donePlan, firstTaskId);
      expect(todoPlan.timeline[0].status).toBe("todo");
    });
  });

  describe("delayTaskInPlan", () => {
    it("delays task and cascades to dependent tasks while keeping done tasks unmoved", () => {
      const plan = createTestPlan();
      // Suppose task 0 is done, task 1 depends on 0, task 2 depends on 1
      const donePlan = toggleTaskStatus(plan, plan.timeline[0].id);
      const originalTask0DueDate = donePlan.timeline[0].dueDate;

      // Try to delay task 0 (which is done) -> should be rejected safely
      const delayDoneResult = delayTaskInPlan(donePlan, donePlan.timeline[0].id, 5);
      expect(delayDoneResult.error).toBe("Completed tasks cannot be delayed");
      expect(delayDoneResult.plan.timeline[0].dueDate).toBe(originalTask0DueDate);

      // Now delay task 1 by 3 days
      const task1Id = donePlan.timeline[1].id;
      const originalTask1DueDate = donePlan.timeline[1].dueDate;

      const delayResult = delayTaskInPlan(donePlan, task1Id, 3);
      expect(delayResult.error).toBeUndefined();
      expect(delayResult.movedTaskIds).toContain(task1Id);

      // Verify task 0 (which is done) did NOT move
      const task0AfterDelay = delayResult.plan.timeline.find(
        (t) => t.id === donePlan.timeline[0].id
      )!;
      expect(task0AfterDelay.dueDate).toBe(originalTask0DueDate);
      expect(task0AfterDelay.status).toBe("done");

      // Verify task 1 moved forward
      const task1AfterDelay = delayResult.plan.timeline.find((t) => t.id === task1Id)!;
      expect(task1AfterDelay.dueDate).not.toBe(originalTask1DueDate);
    });

    it("rejects delays that push tasks past the event date without crashing", () => {
      const plan = createTestPlan();
      const lastTask = plan.timeline[plan.timeline.length - 1];

      // Delaying by 30 days when event is close should exceed event date
      const result = delayTaskInPlan(plan, lastTask.id, 30);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/cannot be after event date/);
      expect(result.movedTaskIds).toHaveLength(0);
      // Timeline remains unaffected
      expect(result.plan.timeline).toEqual(plan.timeline);
    });

    it("keeps plan.source and metadata intact after delaying tasks", () => {
      const plan = createTestPlan();
      plan.source = "ai";
      plan.modelUsed = "gemini-3.6-flash";

      const result = delayTaskInPlan(plan, plan.timeline[0].id, 1);
      expect(result.plan.source).toBe("ai");
      expect(result.plan.modelUsed).toBe("gemini-3.6-flash");
    });
  });
});

