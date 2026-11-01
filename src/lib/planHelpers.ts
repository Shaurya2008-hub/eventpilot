import { rebalance, type BudgetCategory } from "./budget";
import { reflow, TimelineError, type Task } from "./timeline";
import type { Plan } from "./schemas";

export interface DelayTaskResult {
  plan: Plan;
  movedTaskIds: string[];
  movedTaskTitles: string[];
  error?: string;
}

/**
 * Updates a single category allocation using proportional rebalancing.
 * Guarantees that the sum of all categories equals the total plan budget,
 * and preserves the plan's metadata and originalBudget.
 */
export function applyBudgetChange(
  plan: Plan,
  category: BudgetCategory,
  newValue: number
): Plan {
  const originalBudget = plan.originalBudget ?? { ...plan.budget };
  const updatedBudget = rebalance(plan.budget, category, newValue);

  return {
    ...plan,
    budget: updatedBudget,
    originalBudget,
  };
}

/**
 * Resets the budget allocations back to the original suggested split
 * that was created when the plan was first generated.
 */
export function resetPlanBudget(plan: Plan): Plan {
  const original = plan.originalBudget ?? { ...plan.budget };
  return {
    ...plan,
    budget: { ...original },
    originalBudget: { ...original },
  };
}

/**
 * Toggles a task's status between "todo" and "done".
 */
export function toggleTaskStatus(plan: Plan, taskId: string): Plan {
  const updatedTimeline = plan.timeline.map((task) => {
    if (task.id !== taskId) return task;
    const nextStatus: Task["status"] = task.status === "done" ? "todo" : "done";
    return { ...task, status: nextStatus };
  });

  return {
    ...plan,
    timeline: updatedTimeline,
  };
}

/**
 * Delays a task by N days and cascades date shifts to dependent tasks using reflow().
 * Does not modify tasks with status "done".
 * If reflow rejects the change (e.g. date past event date), catches the error and returns it safely.
 */
export function delayTaskInPlan(
  plan: Plan,
  taskId: string,
  delayDays: number
): DelayTaskResult {
  const targetTask = plan.timeline.find((t) => t.id === taskId);
  if (!targetTask) {
    return {
      plan,
      movedTaskIds: [],
      movedTaskTitles: [],
      error: `Task with id "${taskId}" not found`,
    };
  }

  if (targetTask.status === "done") {
    return {
      plan,
      movedTaskIds: [],
      movedTaskTitles: [],
      error: "Completed tasks cannot be delayed",
    };
  }

  if (delayDays <= 0) {
    return {
      plan,
      movedTaskIds: [],
      movedTaskTitles: [],
      error: "Delay must be at least 1 day",
    };
  }

  try {
    const updatedTimeline = reflow(plan.timeline, {
      taskId,
      delayDays,
      eventDate: plan.input.eventDate,
    });

    const oldDates = new Map(plan.timeline.map((t) => [t.id, t.dueDate]));
    const movedTasks = updatedTimeline.filter(
      (t) => oldDates.get(t.id) !== t.dueDate
    );

    return {
      plan: {
        ...plan,
        timeline: updatedTimeline,
      },
      movedTaskIds: movedTasks.map((t) => t.id),
      movedTaskTitles: movedTasks.map((t) => t.title),
    };
  } catch (err) {
    const errorMessage =
      err instanceof TimelineError || err instanceof Error
        ? err.message
        : "Failed to adjust dates";

    return {
      plan,
      movedTaskIds: [],
      movedTaskTitles: [],
      error: errorMessage,
    };
  }
}
