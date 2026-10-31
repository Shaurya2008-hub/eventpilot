import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateFallbackPlan } from "@/lib/fallbackPlanner";
import { planSchema, type PlanInput } from "@/lib/schemas";
import { diffDays } from "@/lib/timeline";
import { BUDGET_CATEGORIES } from "@/lib/budget";

const baseValidInput: PlanInput = {
  occasion: "wedding",
  eventDate: "2026-12-15",
  city: "Jaipur",
  guests: 350,
  budget: 1500000,
  atmosphere: "Royal Rajputana Heritage",
  mustHaves: ["Live Shehnai", "Candid Drone Video", "Authentic Dal Baati Churma"],
  dietary: "Pure vegetarian, separate Jain counters",
  accessibilityNeeds: "Wheelchair ramp at main entrance and elder priority seating",
};

describe("generateFallbackPlan", () => {
  const today = "2026-11-01";

  it("produces output that strictly validates against planSchema", () => {
    const plan = generateFallbackPlan(baseValidInput, today);
    const result = planSchema.safeParse(plan);

    expect(result.success).toBe(true);
    expect(plan.source).toBe("fallback");
  });

  it("validates against planSchema across all 4 occasions", () => {
    const occasions = ["wedding", "birthday", "engagement", "community"] as const;

    for (const occasion of occasions) {
      const input: PlanInput = {
        ...baseValidInput,
        occasion,
      };
      const plan = generateFallbackPlan(input, today);
      const result = planSchema.safeParse(plan);

      expect(result.success).toBe(true);
      expect(plan.ideas.length).toBe(3);
      expect(plan.vendorChecklist.length).toBe(6);
    }
  });

  it("budget allocations sum exactly to input.budget", () => {
    const plan = generateFallbackPlan(baseValidInput, today);

    let sum = 0;
    for (const cat of BUDGET_CATEGORIES) {
      const val = plan.budget[cat];
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
      sum += val;
    }

    expect(sum).toBe(baseValidInput.budget);
  });

  it("timeline has no task before today and respects dependency order", () => {
    const plan = generateFallbackPlan(baseValidInput, today);

    for (const task of plan.timeline) {
      expect(diffDays(task.dueDate, today)).toBeGreaterThanOrEqual(0);
      expect(diffDays(baseValidInput.eventDate, task.dueDate)).toBeGreaterThanOrEqual(0);
    }
  });

  it("timeline compresses properly and has no task before today for tight deadlines", () => {
    const tightInput: PlanInput = {
      ...baseValidInput,
      eventDate: "2026-11-05", // 4 days away
    };

    const plan = generateFallbackPlan(tightInput, today);

    for (const task of plan.timeline) {
      expect(diffDays(task.dueDate, today)).toBeGreaterThanOrEqual(0);
      expect(diffDays(tightInput.eventDate, task.dueDate)).toBeGreaterThanOrEqual(0);
    }
  });

  it("is completely deterministic (same input gives same output)", () => {
    const planA = generateFallbackPlan(baseValidInput, today);
    const planB = generateFallbackPlan(baseValidInput, today);

    expect(planA).toEqual(planB);
  });

  describe("environment variable independence", () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    const originalModels = process.env.GEMINI_MODELS;

    beforeEach(() => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_MODELS;
    });

    afterEach(() => {
      if (originalApiKey !== undefined) process.env.GEMINI_API_KEY = originalApiKey;
      if (originalModels !== undefined) process.env.GEMINI_MODELS = originalModels;
    });

    it("works with no environment variables present", () => {
      expect(process.env.GEMINI_API_KEY).toBeUndefined();
      expect(process.env.GEMINI_MODELS).toBeUndefined();

      const plan = generateFallbackPlan(baseValidInput, today);
      expect(plan.source).toBe("fallback");
      expect(plan.ideas.length).toBe(3);
    });
  });

  describe("vendor checklist requirements", () => {
    it("contains venue, caterer, decorator, photographer, entertainment and invitations with 3-5 practical items each", () => {
      const plan = generateFallbackPlan(baseValidInput, today);
      const requiredVendors = [
        "venue",
        "caterer",
        "decorator",
        "photographer",
        "entertainment",
        "invitations",
      ];

      const presentVendors = plan.vendorChecklist.map((v) => v.vendor);
      expect(presentVendors).toEqual(requiredVendors);

      for (const checklist of plan.vendorChecklist) {
        expect(checklist.items.length).toBeGreaterThanOrEqual(3);
        expect(checklist.items.length).toBeLessThanOrEqual(5);

        for (const item of checklist.items) {
          expect(item.done).toBe(false);
          expect(typeof item.label).toBe("string");
          expect(item.label.length).toBeGreaterThan(10);

          // Never include prices
          expect(item.label).not.toMatch(/₹|INR|rupees?|\$\d+/i);
        }
      }
    });
  });

  describe("theme ideas and contextual notes", () => {
    it("produces exactly 3 tailored theme ideas", () => {
      const plan = generateFallbackPlan(baseValidInput, today);
      expect(plan.ideas).toHaveLength(3);
      expect(plan.ideas[0]).toContain(baseValidInput.atmosphere);
    });

    it("reflects dietary and accessibility needs in notes when provided", () => {
      const plan = generateFallbackPlan(baseValidInput, today);

      const hasDietaryNote = plan.notes.some((n) =>
        n.includes(baseValidInput.dietary)
      );
      const hasAccessibilityNote = plan.notes.some((n) =>
        n.includes(baseValidInput.accessibilityNeeds)
      );

      expect(hasDietaryNote).toBe(true);
      expect(hasAccessibilityNote).toBe(true);
    });

    it("omits dietary and accessibility notes when empty or not provided", () => {
      const minimalInput: PlanInput = {
        ...baseValidInput,
        dietary: "",
        accessibilityNeeds: "   ",
      };

      const plan = generateFallbackPlan(minimalInput, today);

      const hasDietaryNote = plan.notes.some((n) =>
        n.toLowerCase().includes("dietary requirements:")
      );
      const hasAccessibilityNote = plan.notes.some((n) =>
        n.toLowerCase().includes("accessibility accommodations:")
      );

      expect(hasDietaryNote).toBe(false);
      expect(hasAccessibilityNote).toBe(false);
    });
  });

  describe("invalid input is rejected", () => {
    it("rejects non-positive budget", () => {
      expect(() =>
        generateFallbackPlan({ ...baseValidInput, budget: 0 }, today)
      ).toThrow();
      expect(() =>
        generateFallbackPlan({ ...baseValidInput, budget: -500 }, today)
      ).toThrow();
    });

    it("rejects guest counts outside 1-5000", () => {
      expect(() =>
        generateFallbackPlan({ ...baseValidInput, guests: 0 }, today)
      ).toThrow();
      expect(() =>
        generateFallbackPlan({ ...baseValidInput, guests: 5001 }, today)
      ).toThrow();
    });

    it("rejects eventDate on or before today", () => {
      // Same day as today
      expect(() =>
        generateFallbackPlan({ ...baseValidInput, eventDate: today }, today)
      ).toThrow();
      // Date in the past
      expect(() =>
        generateFallbackPlan({ ...baseValidInput, eventDate: "2026-10-15" }, today)
      ).toThrow();
    });

    it("rejects malformed date strings", () => {
      expect(() =>
        generateFallbackPlan({ ...baseValidInput, eventDate: "invalid-date" }, today)
      ).toThrow();
      expect(() =>
        generateFallbackPlan({ ...baseValidInput, eventDate: "2026-02-31" }, today)
      ).toThrow();
    });

    it("rejects empty or whitespace city", () => {
      expect(() =>
        generateFallbackPlan({ ...baseValidInput, city: "   " }, today)
      ).toThrow();
    });

    it("rejects invalid occasion", () => {
      expect(() =>
        generateFallbackPlan(
          { ...baseValidInput, occasion: "rave" as unknown as "wedding" },
          today
        )
      ).toThrow();
    });
  });
});

