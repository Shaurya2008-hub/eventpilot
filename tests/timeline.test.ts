import { describe, it, expect } from "vitest";
import {
  generateTimeline,
  reflow,
  detectCycle,
  diffDays,
  TimelineError,
  InvalidDateError,
  type Task,
} from "@/lib/timeline";

function assertValidTimeline(tasks: Task[], today: string, eventDate: string): void {
  const map = new Map(tasks.map((t) => [t.id, t]));

  // 10-14 tasks check
  expect(tasks.length).toBeGreaterThanOrEqual(10);
  expect(tasks.length).toBeLessThanOrEqual(14);

  for (const task of tasks) {
    // No task dated before today
    expect(diffDays(task.dueDate, today)).toBeGreaterThanOrEqual(0);
    // No task dated after eventDate
    expect(diffDays(eventDate, task.dueDate)).toBeGreaterThanOrEqual(0);

    // Dependency order always valid: task is never due before any dependency
    for (const depId of task.dependsOn) {
      const dep = map.get(depId);
      expect(dep).toBeDefined();
      if (dep) {
        expect(diffDays(task.dueDate, dep.dueDate)).toBeGreaterThanOrEqual(0);
      }
    }
  }
}

describe("timeline generation & compression", () => {
  it("generates ideal timeline when there is ample lead time", () => {
    const today = "2026-01-01";
    const eventDate = "2026-06-01"; // 151 days ahead (> 90 days)

    const timeline = generateTimeline(eventDate, today);
    assertValidTimeline(timeline, today, eventDate);

    // Ample lead time means no compression needed
    for (const task of timeline) {
      expect(task.compressed).toBe(false);
      expect(task.status).toBe("todo");
    }
  });

  it("handles compression case proportionally when event is too close", () => {
    const today = "2026-11-01";
    const eventDate = "2026-11-15"; // Only 14 days ahead (< 90 days)

    const timeline = generateTimeline(eventDate, today);
    assertValidTimeline(timeline, today, eventDate);

    // Earlier tasks must be compressed
    const compressedTasks = timeline.filter((t) => t.compressed);
    expect(compressedTasks.length).toBeGreaterThan(0);

    // No task before today
    for (const task of timeline) {
      expect(diffDays(task.dueDate, today)).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles tight compression case (event is 2 days away)", () => {
    const today = "2026-11-01";
    const eventDate = "2026-11-03"; // 2 days away

    const timeline = generateTimeline(eventDate, today);
    assertValidTimeline(timeline, today, eventDate);

    for (const task of timeline) {
      expect(diffDays(task.dueDate, today)).toBeGreaterThanOrEqual(0);
      expect(diffDays(eventDate, task.dueDate)).toBeGreaterThanOrEqual(0);
    }
  });

  it("has no cycles in the task dependency graph", () => {
    const timeline = generateTimeline("2026-12-01", "2026-11-01");
    expect(detectCycle(timeline)).toBe(false);
  });
});

describe("invalid dates and error handling", () => {
  it("throws typed error if eventDate is invalid", () => {
    expect(() => generateTimeline("invalid-date", "2026-11-01")).toThrow(TimelineError);
    expect(() => generateTimeline("2026-02-31", "2026-11-01")).toThrow(InvalidDateError);
  });

  it("throws typed error if today is invalid", () => {
    expect(() => generateTimeline("2026-12-01", "not-a-date")).toThrow(TimelineError);
  });

  it("throws typed error if eventDate is not after today", () => {
    // Same day
    expect(() => generateTimeline("2026-11-01", "2026-11-01")).toThrow(TimelineError);
    // In the past
    expect(() => generateTimeline("2026-10-15", "2026-11-01")).toThrow(TimelineError);
  });
});

describe("reflow", () => {
  it("cascades delay to dependent tasks", () => {
    const today = "2026-08-01";
    const eventDate = "2026-12-01";
    const timeline = generateTimeline(eventDate, today);

    const venueBooking = timeline.find((t) => t.id === "book_venue")!;
    expect(venueBooking).toBeDefined();

    // Delay book_venue by 10 days
    const delayedVenueDate = "2026-10-01";
    const reflowed = reflow(timeline, {
      taskId: "book_venue",
      newDueDate: delayedVenueDate,
      eventDate,
    });

    const updatedVenue = reflowed.find((t) => t.id === "book_venue")!;
    expect(updatedVenue.dueDate).toBe(delayedVenueDate);

    // Dependent tasks must be updated so they are never due before book_venue
    const tasting = reflowed.find((t) => t.id === "catering_tasting")!;
    expect(diffDays(tasting.dueDate, delayedVenueDate)).toBeGreaterThanOrEqual(0);

    // Invariant holds
    assertValidTimeline(reflowed, today, eventDate);
  });

  it("leaves tasks with status 'done' untouched", () => {
    const today = "2026-08-01";
    const eventDate = "2026-12-01";
    const timeline = generateTimeline(eventDate, today);

    // Mark budget as done
    const budgetTask = timeline.find((t) => t.id === "fix_budget")!;
    budgetTask.status = "done";
    const originalBudgetDueDate = budgetTask.dueDate;

    // Reflow with a general event delay
    const reflowed = reflow(timeline, {
      newEventDate: "2026-12-15",
    });

    const updatedBudget = reflowed.find((t) => t.id === "fix_budget")!;
    expect(updatedBudget.status).toBe("done");
    expect(updatedBudget.dueDate).toBe(originalBudgetDueDate);
  });

  it("rejects any date after the event date", () => {
    const today = "2026-11-01";
    const eventDate = "2026-12-01";
    const timeline = generateTimeline(eventDate, today);

    // Delaying a task past eventDate must be rejected
    expect(() =>
      reflow(timeline, {
        taskId: "book_venue",
        newDueDate: "2026-12-05", // 4 days after eventDate
        eventDate,
      })
    ).toThrow(TimelineError);
  });

  it("rejects when moving event date earlier than an existing task", () => {
    const today = "2026-10-01";
    const eventDate = "2026-12-01";
    const timeline = generateTimeline(eventDate, today);

    // Mark day_before_checks as done on 2026-11-30
    const dayBefore = timeline.find((t) => t.id === "day_before_checks")!;
    dayBefore.status = "done";

    // Moving event date earlier than this done task's date must be rejected
    expect(() =>
      reflow(timeline, {
        newEventDate: "2026-11-15",
      })
    ).toThrow(TimelineError);
  });
});

