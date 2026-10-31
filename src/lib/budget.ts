export const BUDGET_CATEGORIES = [
  "venue",
  "catering",
  "decor",
  "photography",
  "entertainment",
  "contingency",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export type Occasion = "wedding" | "birthday" | "engagement" | "community";

export type BudgetAllocations = Record<BudgetCategory, number>;

export class InvalidBudgetError extends Error {
  constructor(message: string = "totalBudget must be a positive integer") {
    super(message);
    this.name = "InvalidBudgetError";
    Object.setPrototypeOf(this, InvalidBudgetError.prototype);
  }
}

const BASE_WEIGHTS: Record<Occasion, Record<BudgetCategory, number>> = {
  wedding: {
    venue: 25,
    catering: 30,
    decor: 15,
    photography: 12,
    entertainment: 10,
    contingency: 8,
  },
  birthday: {
    venue: 20,
    catering: 35,
    decor: 15,
    photography: 10,
    entertainment: 12,
    contingency: 8,
  },
  engagement: {
    venue: 25,
    catering: 30,
    decor: 18,
    photography: 12,
    entertainment: 7,
    contingency: 8,
  },
  community: {
    venue: 20,
    catering: 40,
    decor: 10,
    photography: 5,
    entertainment: 15,
    contingency: 10,
  },
};

/**
 * Distributes an integer rupee total among categories according to weights
 * using the Largest-Remainder Method (Hare-Niemeyer method).
 * Ties in remainders are broken by category order in BUDGET_CATEGORIES.
 */
function distributeLargestRemainder(
  total: number,
  categoryWeights: { category: BudgetCategory; weight: number }[]
): BudgetAllocations {
  const result: BudgetAllocations = {
    venue: 0,
    catering: 0,
    decor: 0,
    photography: 0,
    entertainment: 0,
    contingency: 0,
  };

  if (total <= 0 || categoryWeights.length === 0) {
    return result;
  }

  const sumWeights = categoryWeights.reduce((acc, curr) => acc + curr.weight, 0);
  const effectiveWeights =
    sumWeights > 0
      ? categoryWeights
      : categoryWeights.map((cw) => ({ ...cw, weight: 1 }));
  const effectiveTotalWeight =
    sumWeights > 0 ? sumWeights : categoryWeights.length;

  interface ItemAllocation {
    category: BudgetCategory;
    floor: number;
    remainder: number;
    orderIndex: number;
  }

  const items: ItemAllocation[] = effectiveWeights.map((item) => {
    const exact = (item.weight / effectiveTotalWeight) * total;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    return {
      category: item.category,
      floor,
      remainder,
      orderIndex: BUDGET_CATEGORIES.indexOf(item.category),
    };
  });

  const sumFloors = items.reduce((acc, curr) => acc + curr.floor, 0);
  const leftover = total - sumFloors;

  // Sort descending by remainder, breaking ties by category order
  items.sort((a, b) => {
    const diff = b.remainder - a.remainder;
    if (Math.abs(diff) > 1e-9) {
      return diff;
    }
    return a.orderIndex - b.orderIndex;
  });

  for (const item of items) {
    result[item.category] = item.floor;
  }

  for (let i = 0; i < leftover; i++) {
    const category = items[i % items.length].category;
    result[category] += 1;
  }

  return result;
}

/**
 * Calculates budget allocations across celebration categories.
 *
 * @param totalBudget - Positive integer rupee amount.
 * @param guestCount - Number of expected guests.
 * @param occasion - Type of event.
 * @returns Non-negative integer rupee allocations summing exactly to totalBudget.
 * @throws {InvalidBudgetError} if totalBudget is not a positive integer.
 */
export function calculateBudget(
  totalBudget: number,
  guestCount: number,
  occasion: Occasion
): BudgetAllocations {
  if (
    typeof totalBudget !== "number" ||
    !Number.isInteger(totalBudget) ||
    totalBudget <= 0
  ) {
    throw new InvalidBudgetError(
      `totalBudget must be a positive integer, received: ${totalBudget}`
    );
  }

  const base = BASE_WEIGHTS[occasion];
  const safeGuestCount = Math.max(0, Number.isFinite(guestCount) ? guestCount : 0);
  const cateringWeight = base.catering + safeGuestCount * 0.1;

  const weights: { category: BudgetCategory; weight: number }[] =
    BUDGET_CATEGORIES.map((category) => ({
      category,
      weight: category === "catering" ? cateringWeight : base[category],
    }));

  return distributeLargestRemainder(totalBudget, weights);
}

/**
 * Rebalances category allocations after a user modifies one category.
 *
 * The modified category is clamped between 0 and totalBudget.
 * The difference is spread over the other categories proportionally
 * using the Largest-Remainder Method.
 *
 * @param allocations - Current budget allocations.
 * @param changedCategory - Category that was edited.
 * @param newValue - New target value for changedCategory.
 * @returns Rebalanced BudgetAllocations satisfying the invariant.
 */
export function rebalance(
  allocations: BudgetAllocations,
  changedCategory: BudgetCategory,
  newValue: number
): BudgetAllocations {
  const totalBudget = BUDGET_CATEGORIES.reduce(
    (sum, cat) => sum + (allocations[cat] ?? 0),
    0
  );

  const roundedNewValue = Number.isFinite(newValue) ? Math.round(newValue) : 0;
  const clampedValue = Math.max(0, Math.min(totalBudget, roundedNewValue));
  const remainingTotal = totalBudget - clampedValue;

  const otherCategories = BUDGET_CATEGORIES.filter(
    (cat) => cat !== changedCategory
  );

  const otherWeights = otherCategories.map((cat) => ({
    category: cat,
    weight: Math.max(0, allocations[cat] ?? 0),
  }));

  const redistributedOthers = distributeLargestRemainder(
    remainingTotal,
    otherWeights
  );

  return {
    ...redistributedOthers,
    [changedCategory]: clampedValue,
  };
}

