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
 * @param plan - Current celebration plan.
 * @param category - Category to update.
 * @param newValue - New rupee value.
 * @returns Updated Plan preserving invariants.
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
 * Resets budget allocations back to the initial suggested split.
 * @param plan - Current celebration plan.
 * @returns Plan with original budget allocations restored.
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
 * @param plan - Current celebration plan.
 * @param taskId - Identifier of the task to toggle.
 * @returns Updated Plan with task status flipped.
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
 * Delays a task by N days and cascades date shifts to dependent tasks.
 * @param plan - Current celebration plan.
 * @param taskId - Identifier of the task to delay.
 * @param delayDays - Number of days to postpone the task.
 * @returns Result object with updated Plan or error message.
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
