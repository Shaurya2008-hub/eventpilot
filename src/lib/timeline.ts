export interface Task {
  id: string;
  title: string;
  dependsOn: string[];
  offsetDaysBeforeEvent: number;
  dueDate: string;
  status: "todo" | "done";
  compressed: boolean;
}

export interface ReflowChanges {
  taskId?: string;
  newDueDate?: string;
  delayDays?: number;
  newEventDate?: string;
  eventDate?: string;
}

export class TimelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimelineError";
    Object.setPrototypeOf(this, TimelineError.prototype);
  }
}

export class InvalidDateError extends TimelineError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDateError";
    Object.setPrototypeOf(this, InvalidDateError.prototype);
  }
}

const MS_PER_DAY = 86_400_000;

/**
 * Parses a YYYY-MM-DD date string into UTC milliseconds timestamp.
 * Throws InvalidDateError if format or calendar day is invalid.
 */
export function parseUTCDate(dateStr: string): number {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new InvalidDateError(
      `Invalid date format: "${dateStr}". Expected YYYY-MM-DD.`
    );
  }
  const parts = dateStr.split("-").map(Number);
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;

  const timestamp = Date.UTC(year, month - 1, day);
  const d = new Date(timestamp);
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() + 1 !== month ||
    d.getUTCDate() !== day
  ) {
    throw new InvalidDateError(`Invalid calendar date: "${dateStr}".`);
  }
  return timestamp;
}

/**
 * Formats a UTC timestamp into a YYYY-MM-DD date-only string.
 */
export function formatUTCDate(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns (dateA - dateB) in integer days using UTC arithmetic.
 */
export function diffDays(dateA: string, dateB: string): number {
  const tA = parseUTCDate(dateA);
  const tB = parseUTCDate(dateB);
  return Math.round((tA - tB) / MS_PER_DAY);
}

/**
 * Adds an integer number of days to a YYYY-MM-DD date string using UTC arithmetic.
 */
export function addDays(dateStr: string, days: number): string {
  const t = parseUTCDate(dateStr);
  return formatUTCDate(t + days * MS_PER_DAY);
}

export interface TaskTemplate {
  id: string;
  title: string;
  dependsOn: string[];
  offsetDaysBeforeEvent: number;
}

export const CELEBRATION_TASK_TEMPLATES: readonly TaskTemplate[] = [
  {
    id: "fix_budget",
    title: "Fix celebration budget and estimate guest count",
    dependsOn: [],
    offsetDaysBeforeEvent: 90,
  },
  {
    id: "shortlist_venue",
    title: "Shortlist venues and check availability",
    dependsOn: ["fix_budget"],
    offsetDaysBeforeEvent: 80,
  },
  {
    id: "book_venue",
    title: "Book celebration venue and pay deposit",
    dependsOn: ["shortlist_venue"],
    offsetDaysBeforeEvent: 70,
  },
  {
    id: "catering_tasting",
    title: "Shortlist caterers and food tasting",
    dependsOn: ["book_venue"],
    offsetDaysBeforeEvent: 60,
  },
  {
    id: "decor_theme",
    title: "Finalise decor theme and book decorator",
    dependsOn: ["book_venue"],
    offsetDaysBeforeEvent: 50,
  },
  {
    id: "design_invitations",
    title: "Design physical and digital invitations",
    dependsOn: ["fix_budget"],
    offsetDaysBeforeEvent: 45,
  },
  {
    id: "send_invitations",
    title: "Send invitations and track RSVPs",
    dependsOn: ["design_invitations", "book_venue"],
    offsetDaysBeforeEvent: 35,
  },
  {
    id: "finalise_menu",
    title: "Finalise catering menu and dietary preferences",
    dependsOn: ["catering_tasting"],
    offsetDaysBeforeEvent: 25,
  },
  {
    id: "confirm_vendors",
    title: "Confirm photographer, music, and priests/performers",
    dependsOn: ["decor_theme"],
    offsetDaysBeforeEvent: 20,
  },
  {
    id: "final_headcount",
    title: "Lock final headcount with venue and caterer",
    dependsOn: ["send_invitations", "finalise_menu"],
    offsetDaysBeforeEvent: 10,
  },
  {
    id: "outfits_pooja_items",
    title: "Finalise family outfits and pooja/ritual supplies",
    dependsOn: ["decor_theme"],
    offsetDaysBeforeEvent: 5,
  },
  {
    id: "day_before_checks",
    title: "Day-before venue walkthrough and vendor check-in",
    dependsOn: ["final_headcount", "confirm_vendors", "outfits_pooja_items"],
    offsetDaysBeforeEvent: 1,
  },
] as const;

/**
 * Topologically sorts task templates or tasks.
 */
export function getTopologicalOrder<T extends { id: string; dependsOn: string[] }>(
  items: readonly T[]
): string[] {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const order: string[] = [];

  function visit(id: string): void {
    if (inStack.has(id)) {
      throw new TimelineError(`Cycle detected in dependency graph involving task "${id}".`);
    }
    if (!visited.has(id)) {
      inStack.add(id);
      const item = itemMap.get(id);
      if (item) {
        for (const depId of item.dependsOn) {
          visit(depId);
        }
      }
      inStack.delete(id);
      visited.add(id);
      order.push(id);
    }
  }

  for (const item of items) {
    if (!visited.has(item.id)) {
      visit(item.id);
    }
  }

  return order;
}

/**
 * Checks whether a list of tasks contains a dependency cycle.
 */
export function detectCycle(tasks: readonly { id: string; dependsOn: string[] }[]): boolean {
  try {
    getTopologicalOrder(tasks);
    return false;
  } catch {
    return true;
  }
}

/**
 * Generates celebration timeline tasks as a dependency graph.
 *
 * @param eventDate - Celebration date (YYYY-MM-DD, UTC).
 * @param today - Current reference date (YYYY-MM-DD, UTC).
 * @returns Array of Tasks scheduled between today and eventDate.
 * @throws {InvalidDateError | TimelineError} if dates are invalid or eventDate is not after today.
 */
export function generateTimeline(eventDate: string, today: string): Task[] {
  parseUTCDate(eventDate);
  parseUTCDate(today);

  const availableDays = diffDays(eventDate, today);
  if (availableDays <= 0) {
    throw new TimelineError(
      `eventDate (${eventDate}) must be strictly after today (${today}).`
    );
  }

  const maxIdealOffset = Math.max(
    ...CELEBRATION_TASK_TEMPLATES.map((t) => t.offsetDaysBeforeEvent)
  );

  const isCompressNeeded = availableDays < maxIdealOffset;
  const topoOrder = getTopologicalOrder(CELEBRATION_TASK_TEMPLATES);
  const taskMap = new Map<string, Task>();

  // Assign dates in topological order to guarantee dependency constraints
  for (const taskId of topoOrder) {
    const template = CELEBRATION_TASK_TEMPLATES.find((t) => t.id === taskId)!;
    const idealDueDate = addDays(eventDate, -template.offsetDaysBeforeEvent);

    let tentativeDate: string;
    if (isCompressNeeded) {
      // Proportional offset scaled into availableDays window
      const scaledOffset = Math.min(
        availableDays,
        Math.max(
          0,
          Math.round(template.offsetDaysBeforeEvent * (availableDays / maxIdealOffset))
        )
      );
      tentativeDate = addDays(eventDate, -scaledOffset);
    } else {
      tentativeDate = idealDueDate;
    }

    // Clamp tentative date to never be before today
    if (diffDays(tentativeDate, today) < 0) {
      tentativeDate = today;
    }

    // Find earliest allowed date based on completed dependencies
    let earliestAllowed = today;
    for (const depId of template.dependsOn) {
      const depTask = taskMap.get(depId);
      if (depTask && diffDays(depTask.dueDate, earliestAllowed) > 0) {
        earliestAllowed = depTask.dueDate;
      }
    }

    // Task cannot be due before its dependencies
    let dueDate = tentativeDate;
    if (diffDays(earliestAllowed, dueDate) > 0) {
      dueDate = earliestAllowed;
    }

    // Task cannot be due after event date
    if (diffDays(dueDate, eventDate) > 0) {
      dueDate = eventDate;
    }

    const compressed = dueDate !== idealDueDate;

    const task: Task = {
      id: template.id,
      title: template.title,
      dependsOn: [...template.dependsOn],
      offsetDaysBeforeEvent: template.offsetDaysBeforeEvent,
      dueDate,
      status: "todo",
      compressed,
    };

    taskMap.set(taskId, task);
  }

  // Return tasks in original template order
  return CELEBRATION_TASK_TEMPLATES.map((t) => taskMap.get(t.id)!);
}

/**
 * Applies a delay to a task or sets a new event date, cascading
 * later dates to dependent tasks.
 *
 * Never changes tasks with status "done".
 * Rejects any date after the event date.
 *
 * @param tasks - Current tasks.
 * @param changes - The modifications to apply.
 * @returns New array of updated Tasks.
 * @throws {TimelineError | InvalidDateError} if any resulting date is after the event date.
 */
export function reflow(tasks: readonly Task[], changes: ReflowChanges): Task[] {
  if (tasks.length === 0) {
    return [];
  }

  // Deep clone tasks
  const updatedTasks: Task[] = tasks.map((t) => ({
    ...t,
    dependsOn: [...t.dependsOn],
  }));
  const taskMap = new Map<string, Task>(updatedTasks.map((t) => [t.id, t]));

  // Determine current / baseline event date
  let currentEventDate = changes.eventDate ?? "";
  if (!currentEventDate) {
    for (const t of tasks) {
      const candidate = addDays(t.dueDate, t.offsetDaysBeforeEvent);
      if (!currentEventDate || diffDays(candidate, currentEventDate) > 0) {
        currentEventDate = candidate;
      }
    }
  }

  let effectiveEventDate = currentEventDate;

  // Handle new event date
  if (changes.newEventDate) {
    parseUTCDate(changes.newEventDate);
    const delta = diffDays(changes.newEventDate, currentEventDate);
    effectiveEventDate = changes.newEventDate;

    if (delta !== 0) {
      for (const t of updatedTasks) {
        if (t.status !== "done") {
          t.dueDate = addDays(t.dueDate, delta);
        }
      }
    }
  }

  // Apply change to target task
  if (changes.taskId) {
    const target = taskMap.get(changes.taskId);
    if (!target) {
      throw new TimelineError(`Task with id "${changes.taskId}" not found.`);
    }

    if (target.status !== "done") {
      if (changes.newDueDate !== undefined) {
        parseUTCDate(changes.newDueDate);
        target.dueDate = changes.newDueDate;
      } else if (changes.delayDays !== undefined) {
        target.dueDate = addDays(target.dueDate, changes.delayDays);
      }
    }
  }

  // Cascade later dates to dependent tasks in topological order
  const topoOrder = getTopologicalOrder(updatedTasks);
  for (const taskId of topoOrder) {
    const task = taskMap.get(taskId)!;
    let earliestAllowed = task.dueDate;

    for (const depId of task.dependsOn) {
      const depTask = taskMap.get(depId);
      if (depTask && diffDays(depTask.dueDate, earliestAllowed) > 0) {
        earliestAllowed = depTask.dueDate;
      }
    }

    if (task.status !== "done" && diffDays(earliestAllowed, task.dueDate) > 0) {
      task.dueDate = earliestAllowed;
    }
  }

  // Reject any date after the event date
  for (const task of updatedTasks) {
    if (diffDays(task.dueDate, effectiveEventDate) > 0) {
      throw new TimelineError(
        `Task "${task.id}" dueDate (${task.dueDate}) cannot be after event date (${effectiveEventDate}).`
      );
    }
  }

  return updatedTasks;
}

