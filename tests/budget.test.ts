import { describe, it, expect } from "vitest";
import {
  calculateBudget,
  rebalance,
  allocateByWeights,
  InvalidBudgetError,
  BUDGET_CATEGORIES,
  type Occasion,
  type BudgetAllocations,
} from "@/lib/budget";

const OCCASIONS: Occasion[] = ["wedding", "birthday", "engagement", "community"];

function checkInvariant(
  allocations: BudgetAllocations,
  expectedTotal: number
): void {
  let sum = 0;
  for (const cat of BUDGET_CATEGORIES) {
    const val = allocations[cat];
    expect(Number.isInteger(val)).toBe(true);
    expect(val).toBeGreaterThanOrEqual(0);
    sum += val;
  }
  expect(sum).toBe(expectedTotal);
}

describe("budget calculation & invariant tests", () => {
  it("throws InvalidBudgetError for non-positive or non-integer budgets", () => {
    expect(() => calculateBudget(0, 50, "wedding")).toThrow(InvalidBudgetError);
    expect(() => calculateBudget(-100, 50, "wedding")).toThrow(InvalidBudgetError);
    expect(() => calculateBudget(5000.75, 50, "wedding")).toThrow(InvalidBudgetError);
    expect(() => calculateBudget(NaN, 50, "wedding")).toThrow(InvalidBudgetError);
    expect(() => calculateBudget(Infinity, 50, "wedding")).toThrow(InvalidBudgetError);
  });

  it("produces correct integer allocations for small budgets", () => {
    const budget1 = calculateBudget(1, 10, "wedding");
    checkInvariant(budget1, 1);

    const budget5 = calculateBudget(5, 10, "wedding");
    checkInvariant(budget5, 5);

    const budget10 = calculateBudget(10, 10, "birthday");
    checkInvariant(budget10, 10);
  });

  it("increases catering weight when guest count rises", () => {
    const total = 100000;
    const allocLowGuests = calculateBudget(total, 10, "wedding");
    const allocHighGuests = calculateBudget(total, 500, "wedding");

    expect(allocHighGuests.catering).toBeGreaterThan(allocLowGuests.catering);
    checkInvariant(allocLowGuests, total);
    checkInvariant(allocHighGuests, total);
  });

  it("breaks ties in remainders by category order", () => {
    // With equal weights, all categories have equal fractional remainders
    // Category order in BUDGET_CATEGORIES determines who receives leftover rupees
    const total = 1;
    const alloc = calculateBudget(total, 0, "birthday");
    checkInvariant(alloc, total);
    // The single leftover rupee must go to a category and sum must be exactly 1
    const totalAllocated = BUDGET_CATEGORIES.reduce((s, c) => s + alloc[c], 0);
    expect(totalAllocated).toBe(1);
  });

  it("satisfies the invariant across 1000 random budgets, guest counts, and occasions", () => {
    for (let i = 0; i < 1000; i++) {
      // Random budget between 1 and 10,000,000 rupees
      const totalBudget = Math.floor(Math.random() * 10_000_000) + 1;
      // Random guest count between 0 and 2000
      const guestCount = Math.floor(Math.random() * 2001);
      // Random occasion
      const occasion = OCCASIONS[Math.floor(Math.random() * OCCASIONS.length)]!;

      const allocations = calculateBudget(totalBudget, guestCount, occasion);
      checkInvariant(allocations, totalBudget);
    }
  });
});

describe("rebalance", () => {
  it("rebalances proportionally when a category value increases", () => {
    const total = 100000;
    const initial = calculateBudget(total, 100, "wedding");
    checkInvariant(initial, total);

    const updated = rebalance(initial, "venue", initial.venue + 10000);
    expect(updated.venue).toBe(initial.venue + 10000);
    checkInvariant(updated, total);
  });

  it("rebalances proportionally when a category value decreases", () => {
    const total = 100000;
    const initial = calculateBudget(total, 100, "wedding");
    checkInvariant(initial, total);

    const updated = rebalance(initial, "venue", Math.floor(initial.venue / 2));
    expect(updated.venue).toBe(Math.floor(initial.venue / 2));
    checkInvariant(updated, total);
  });

  it("clamps negative values to 0", () => {
    const total = 50000;
    const initial = calculateBudget(total, 50, "birthday");
    const updated = rebalance(initial, "catering", -5000);

    expect(updated.catering).toBe(0);
    checkInvariant(updated, total);
  });

  it("clamps values exceeding total budget to the total", () => {
    const total = 50000;
    const initial = calculateBudget(total, 50, "birthday");
    const updated = rebalance(initial, "decor", 80000);

    expect(updated.decor).toBe(total);
    for (const cat of BUDGET_CATEGORIES) {
      if (cat !== "decor") {
        expect(updated[cat]).toBe(0);
      }
    }
    checkInvariant(updated, total);
  });

  it("handles rebalancing when all other categories had 0", () => {
    const total = 50000;
    const allInVenue: BudgetAllocations = {
      venue: total,
      catering: 0,
      decor: 0,
      photography: 0,
      entertainment: 0,
      contingency: 0,
    };

    const updated = rebalance(allInVenue, "venue", 20000);
    expect(updated.venue).toBe(20000);
    checkInvariant(updated, total);
  });

  it("satisfies the invariant across 1000 random rebalance trials", () => {
    for (let i = 0; i < 1000; i++) {
      const totalBudget = Math.floor(Math.random() * 5_000_000) + 1;
      const guestCount = Math.floor(Math.random() * 1000);
      const occasion = OCCASIONS[Math.floor(Math.random() * OCCASIONS.length)]!;

      const initial = calculateBudget(totalBudget, guestCount, occasion);
      const randomCategory =
        BUDGET_CATEGORIES[Math.floor(Math.random() * BUDGET_CATEGORIES.length)]!;
      // Random new value including out-of-bound values (negative and over budget)
      const randomNewValue = Math.floor(
        (Math.random() * 1.5 - 0.25) * totalBudget
      );

      const rebalanced = rebalance(initial, randomCategory, randomNewValue);
      checkInvariant(rebalanced, totalBudget);
    }
  });
});

describe("allocateByWeights", () => {
  it("allocates budget according to custom weights and satisfies the invariant", () => {
    const total = 500000;
    const weights = {
      venue: 40,
      catering: 30,
      decor: 15,
      photography: 5,
      entertainment: 5,
      contingency: 5,
    };
    const alloc = allocateByWeights(total, weights);
    checkInvariant(alloc, total);
    expect(alloc.venue).toBeGreaterThan(alloc.catering);
    expect(alloc.catering).toBeGreaterThan(alloc.decor);
  });

  it("handles negative and NaN weights by clamping them to 0", () => {
    const total = 200000;
    const weights = {
      venue: 50,
      catering: -20,
      decor: NaN,
      photography: 30,
      entertainment: 0,
      contingency: 20,
    };
    const alloc = allocateByWeights(total, weights);
    checkInvariant(alloc, total);
    expect(alloc.catering).toBe(0);
    expect(alloc.decor).toBe(0);
    expect(alloc.entertainment).toBe(0);
    expect(alloc.venue + alloc.photography + alloc.contingency).toBe(total);
  });

  it("falls back to equal weights if all weights are 0 or clamped to 0", () => {
    const total = 60000;
    const allZeroWeights = {
      venue: 0,
      catering: -5,
      decor: NaN,
      photography: 0,
      entertainment: 0,
      contingency: 0,
    };
    const alloc = allocateByWeights(total, allZeroWeights);
    checkInvariant(alloc, total);
    for (const cat of BUDGET_CATEGORIES) {
      expect(alloc[cat]).toBe(10000);
    }
  });

  it("throws InvalidBudgetError for non-positive or non-integer budgets", () => {
    const validWeights = { venue: 10, catering: 10, decor: 10, photography: 10, entertainment: 10, contingency: 10 };
    expect(() => allocateByWeights(0, validWeights)).toThrow(InvalidBudgetError);
    expect(() => allocateByWeights(-5000, validWeights)).toThrow(InvalidBudgetError);
    expect(() => allocateByWeights(5000.5, validWeights)).toThrow(InvalidBudgetError);
  });

  it("satisfies the invariant across 1000 random weight sets", () => {
    for (let i = 0; i < 1000; i++) {
      const totalBudget = Math.floor(Math.random() * 5_000_000) + 1;
      const randomWeights = {
        venue: (Math.random() - 0.2) * 100,
        catering: (Math.random() - 0.2) * 100,
        decor: Math.random() > 0.8 ? NaN : Math.random() * 50,
        photography: Math.random() * 30,
        entertainment: (Math.random() - 0.5) * 20,
        contingency: Math.random() * 20,
      };
      const alloc = allocateByWeights(totalBudget, randomWeights);
      checkInvariant(alloc, totalBudget);
    }
  });
});

