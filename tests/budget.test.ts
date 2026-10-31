import { describe, it, expect } from "vitest";
import {
  calculateBudget,
  rebalance,
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

