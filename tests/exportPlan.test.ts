import { describe, it, expect } from "vitest";
import {
  buildPlanText,
  buildPlanExportFilename,
} from "@/lib/exportPlan";
import { generateFallbackPlan } from "@/lib/fallbackPlanner";
import type { Plan } from "@/lib/schemas";

function createSamplePlan(): Plan {
  return generateFallbackPlan(
    {
      occasion: "wedding",
      eventDate: "2026-12-31",
      city: "Jaipur",
      guests: 250,
      budget: 1200000,
      atmosphere: "Royal Heritage",
      mustHaves: ["Live Shehnai", "Marigold Decor"],
      dietary: "Pure Vegetarian, Jain Options",
      accessibilityNeeds: "Ramps and ground floor seating",
    },
    "2026-11-01"
  );
}

describe("exportPlan pure module", () => {
  describe("buildPlanExportFilename", () => {
    it("generates correct filename format based on occasion and date", () => {
      const plan = createSamplePlan();
      const filename = buildPlanExportFilename(plan);
      expect(filename).toBe("wedding-2026-12-31.txt");
    });

    it("sanitizes occasion with spaces or special characters", () => {
      const plan = createSamplePlan();
      plan.input.occasion = "community" as unknown as Plan["input"]["occasion"];
      plan.input.eventDate = "2027-02-15";
      const filename = buildPlanExportFilename(plan);
      expect(filename).toBe("community-2027-02-15.txt");
    });

    it("handles missing occasion and date gracefully with fallbacks", () => {
      const minimalPlan = {
        input: {} as unknown as Plan["input"],
      } as Plan;
      const filename = buildPlanExportFilename(minimalPlan);
      expect(filename).toBe("celebration-undated.txt");
    });
  });

  describe("buildPlanText - section verification", () => {
    it("includes all expected sections in the generated plain-text output", () => {
      const plan = createSamplePlan();
      const text = buildPlanText(plan);

      // Main header
      expect(text).toContain("EVENTPILOT CELEBRATION PLAN");

      // Event details section
      expect(text).toContain("EVENT DETAILS");
      expect(text).toContain("Occasion: Wedding");
      expect(text).toContain("City: Jaipur");
      expect(text).toContain("Event Date: 2026-12-31");
      expect(text).toContain("Guest Count: 250");
      expect(text).toContain("Total Budget: ₹12,00,000");
      expect(text).toContain("Atmosphere: Royal Heritage");
      expect(text).toContain("Dietary Notes: Pure Vegetarian, Jain Options");
      expect(text).toContain("Accessibility Needs: Ramps and ground floor seating");
      expect(text).toContain("Must-Haves: Live Shehnai, Marigold Decor");

      // Budget breakdown section
      expect(text).toContain("BUDGET BREAKDOWN");
      expect(text).toContain("Venue & Hall");
      expect(text).toContain("Catering & Food");
      expect(text).toContain("Decor & Lighting");
      expect(text).toContain("Photography & Video");
      expect(text).toContain("Music & Entertainment");
      expect(text).toContain("Emergency Contingency");

      // Planning timeline section
      expect(text).toContain("PLANNING TIMELINE");
      expect(text).toContain("[To-do]");
      expect(text).toContain("Fix celebration budget");

      // Vendor checklist section
      expect(text).toContain("VENDOR CHECKLIST");
      expect(text).toContain("Venue Checklist:");
      expect(text).toContain("Caterer Checklist:");
      expect(text).toContain("[ ]");

      // Theme ideas section
      expect(text).toContain("THEME IDEAS");
      expect(plan.ideas.length).toBeGreaterThan(0);
      expect(text).toContain(plan.ideas[0]);

      // Notes section
      expect(text).toContain("CELEBRATION NOTES");
      expect(plan.notes.length).toBeGreaterThan(0);
      expect(text).toContain(plan.notes[0]);
    });

    it("reflects task completion status and checklist checks accurately", () => {
      const plan = createSamplePlan();
      // Mark first task done
      plan.timeline[0].status = "done";
      // Mark first checklist item done
      plan.vendorChecklist[0].items[0].done = true;

      const text = buildPlanText(plan);

      expect(text).toContain(`[Completed] ${plan.timeline[0].dueDate} - ${plan.timeline[0].title}`);
      expect(text).toContain(`[X] ${plan.vendorChecklist[0].items[0].label}`);
    });
  });

  describe("buildPlanText - graceful handling of missing or optional fields", () => {
    it("handles minimal plan with missing optional preferences without errors", () => {
      const minimalPlan: Plan = {
        source: "fallback",
        input: {
          occasion: "birthday",
          eventDate: "2026-11-20",
          city: "Mumbai",
          guests: 50,
          budget: 200000,
          atmosphere: "",
          mustHaves: [],
          dietary: "",
          accessibilityNeeds: "",
        },
        budget: {
          venue: 40000,
          catering: 70000,
          decor: 30000,
          photography: 20000,
          entertainment: 24000,
          contingency: 16000,
        },
        timeline: [],
        vendorChecklist: [],
        ideas: [],
        notes: [],
      };

      const text = buildPlanText(minimalPlan);

      expect(text).toContain("Occasion: Birthday");
      expect(text).toContain("City: Mumbai");
      expect(text).toContain("Total Budget: ₹2,00,000");
      expect(text).toContain("No timeline tasks scheduled.");
      expect(text).toContain("No vendor checklist available.");
      expect(text).toContain("No theme ideas recorded.");
      expect(text).toContain("No notes recorded.");
      expect(text).not.toContain("undefined");
      expect(text).not.toContain("null");
    });

    it("handles null plan safely", () => {
      const text = buildPlanText(null as unknown as Plan);
      expect(text).toBe("");
    });
  });
});
