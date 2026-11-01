"use client";

import { useState } from "react";
import { usePlanStore } from "@/store/plan-store";
import { diffDays } from "@/lib/timeline";
import { BUDGET_CATEGORIES, type BudgetCategory } from "@/lib/budget";
import {
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  FileText,
  Clock,
  Check,
  Sliders,
  Printer,
  Download,
} from "lucide-react";
import { getLocalTodayString } from "./GuidedPlanForm";
import { WhatIfPanel } from "./WhatIfPanel";
import { downloadPlanAsText } from "@/lib/exportPlan";
import { ChatDrawer } from "./ChatDrawer";

const CATEGORY_DISPLAY_NAMES: Record<BudgetCategory, string> = {
  venue: "Venue & Hall",
  catering: "Catering & Food",
  decor: "Decor & Lighting",
  photography: "Photography & Video",
  entertainment: "Music & Entertainment",
  contingency: "Emergency Contingency",
};

export function PlanView() {
  const plan = usePlanStore((s) => s.plan);
  const startNewPlan = usePlanStore((s) => s.startNewPlan);
  const toggleChecklistItem = usePlanStore((s) => s.toggleChecklistItem);
  const updateCategoryBudget = usePlanStore((s) => s.updateCategoryBudget);
  const resetBudgetToSuggested = usePlanStore((s) => s.resetBudgetToSuggested);
  const toggleTaskStatus = usePlanStore((s) => s.toggleTaskStatus);
  const delayTask = usePlanStore((s) => s.delayTask);

  const [budgetAnnouncement, setBudgetAnnouncement] = useState<string>("");
  const [delayDaysMap, setDelayDaysMap] = useState<Record<string, number>>({});
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});
  const [taskAdjustedNotes, setTaskAdjustedNotes] = useState<
    Record<string, string[]>
  >({});

  if (!plan) return null;

  const today = getLocalTodayString();
  const daysToGo = diffDays(plan.input.eventDate, today);
  const totalBudget = plan.input.budget;
  const liveTotal = BUDGET_CATEGORIES.reduce(
    (acc, cat) => acc + plan.budget[cat],
    0
  );

  // Capitalise only the occasion (e.g. "wedding" -> "Wedding in Jaipur")
  const formattedTitle = `${
    plan.input.occasion.charAt(0).toUpperCase() + plan.input.occasion.slice(1)
  } in ${plan.input.city}`;

  // Map task IDs to human-readable titles
  const taskTitleMap = new Map(plan.timeline.map((t) => [t.id, t.title]));

  const handleBudgetChange = (cat: BudgetCategory, val: number) => {
    const clampedVal = Math.max(0, Math.min(totalBudget, Math.round(val)));
    updateCategoryBudget(cat, clampedVal);
    const catName = CATEGORY_DISPLAY_NAMES[cat];
    setBudgetAnnouncement(
      `${catName} is now ₹${clampedVal.toLocaleString(
        "en-IN"
      )}; total remains ₹${totalBudget.toLocaleString("en-IN")}`
    );
  };

  const handleResetBudget = () => {
    resetBudgetToSuggested();
    setBudgetAnnouncement(
      `Budget allocations reset to suggested split; total remains ₹${totalBudget.toLocaleString(
        "en-IN"
      )}`
    );
  };

  const handleToggleTask = (taskId: string) => {
    toggleTaskStatus(taskId);
    // Clear any delay errors for this task
    if (taskErrors[taskId]) {
      setTaskErrors((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }
  };

  const handleDelayTask = (taskId: string) => {
    const days = delayDaysMap[taskId] ?? 1;
    const result = delayTask(taskId, days);

    if (result.error) {
      setTaskErrors((prev) => ({ ...prev, [taskId]: result.error! }));
      setTaskAdjustedNotes((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    } else {
      setTaskErrors((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setTaskAdjustedNotes((prev) => ({
        ...prev,
        [taskId]: result.movedTitles,
      }));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6">
      {/* Accessible live region for screen readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {budgetAnnouncement}
      </div>

      {/* 1. Header Section */}
      <header className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-accent">
                {plan.input.occasion} Celebration
              </span>
              {/* Status Badge: Meaningful color, text, and accessible text label */}
              {plan.source === "ai" ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400"
                  aria-label={`Plan Source: AI plan (${plan.modelUsed || "Gemini"})`}
                  title={`Plan generated using AI model: ${plan.modelUsed || "Gemini"}`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-purple-400"
                    aria-hidden="true"
                  />
                  AI plan ({plan.modelUsed || "Gemini"})
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400"
                  aria-label="Plan Source: Built-in planner"
                  title="Generated offline using built-in deterministic planning algorithm"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-400"
                    aria-hidden="true"
                  />
                  Built-in planner
                </span>
              )}
            </div>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {formattedTitle}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-accent" aria-hidden="true" />
                <time dateTime={plan.input.eventDate}>
                  {plan.input.eventDate}
                </time>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
                {plan.input.city}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-accent" aria-hidden="true" />
                {plan.input.guests.toLocaleString("en-IN")} Guests
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <IndianRupee
                  className="h-4 w-4 text-accent"
                  aria-hidden="true"
                />
                ₹{plan.input.budget.toLocaleString("en-IN")} Total
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            {/* Days to go counter */}
            <div className="rounded-xl border border-border bg-background px-4 py-2 text-center sm:text-right">
              <span className="block text-2xl font-black text-accent sm:text-3xl">
                {daysToGo > 0 ? daysToGo : 0}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                {daysToGo === 1 ? "Day to go" : "Days to go"}
              </span>
            </div>

            {/* Action Bar: Print, Download as .txt, Start New Plan */}
            <div
              className="flex flex-wrap items-center gap-2 no-print"
              role="toolbar"
              aria-label="Plan actions"
            >
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Print celebration plan"
                title="Print celebration plan"
              >
                <Printer className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={() => downloadPlanAsText(plan)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Download plan as .txt file"
                title="Download plan as .txt file"
              >
                <Download className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>Download as .txt</span>
              </button>

              <button
                type="button"
                onClick={startNewPlan}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Start a new plan</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. "What If?" Scenario Planning Panel */}
      <div className="no-print">
        <WhatIfPanel />
      </div>

      {/* 3. Budget Allocation & Interactive Controls */}
      <section aria-labelledby="budget-heading" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="budget-heading"
              className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
            >
              Budget Allocation
            </h2>
            <p className="mt-1 text-sm text-muted">
              Adjust sliders or rupee amounts. Other categories rebalance
              automatically to keep the exact total.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetBudget}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:self-auto no-print"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset to suggested split</span>
          </button>
        </div>

        {/* Live Total Indicator */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface/70 px-4 py-3 sm:px-6 no-print">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-accent" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Live Total
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-foreground">
              ₹{liveTotal.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-muted">
              / ₹{totalBudget.toLocaleString("en-IN")}
            </span>
            {liveTotal === totalBudget && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                <Check className="h-3 w-3" /> Exact
              </span>
            )}
          </div>
        </div>

        {/* Interactive Sliders & Number Inputs */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4 no-print">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Interactive Category Sliders
          </h3>
          <div className="space-y-4">
            {BUDGET_CATEGORIES.map((cat) => {
              const amount = plan.budget[cat];
              const pct = totalBudget > 0 ? (amount / totalBudget) * 100 : 0;
              const formattedPct = pct.toFixed(1);
              const sliderId = `slider-${cat}`;
              const numberId = `number-${cat}`;

              return (
                <div
                  key={cat}
                  className="rounded-lg border border-border/60 bg-background/40 p-3.5 transition-colors hover:border-border"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor={sliderId}
                      className="text-xs font-semibold text-foreground cursor-pointer"
                    >
                      {CATEGORY_DISPLAY_NAMES[cat]}
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{formattedPct}%</span>
                      <div className="relative flex items-center">
                        <label
                          htmlFor={numberId}
                          className="sr-only"
                        >
                          {CATEGORY_DISPLAY_NAMES[cat]} rupee amount
                        </label>
                        <span
                          className="pointer-events-none absolute left-2 text-xs text-muted"
                          aria-hidden="true"
                        >
                          ₹
                        </span>
                        <input
                          id={numberId}
                          type="number"
                          min={0}
                          max={totalBudget}
                          step={100}
                          value={amount}
                          onChange={(e) =>
                            handleBudgetChange(cat, Number(e.target.value))
                          }
                          aria-label={`${CATEGORY_DISPLAY_NAMES[cat]} rupee amount`}
                          className="w-28 rounded-lg border border-border bg-background py-1 pl-5 pr-2 text-right text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-3">
                    <input
                      id={sliderId}
                      type="range"
                      min={0}
                      max={totalBudget}
                      step={100}
                      value={amount}
                      onChange={(e) =>
                        handleBudgetChange(cat, Number(e.target.value))
                      }
                      aria-label={`${CATEGORY_DISPLAY_NAMES[cat]} budget slider`}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-background accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div
          role="region"
          aria-label="Visual Budget Distribution Bar Chart"
          className="rounded-xl border border-border bg-surface p-5"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Category Breakdown (CSS Chart)
          </h3>
          <div className="mt-4 space-y-3.5">
            {BUDGET_CATEGORIES.map((cat) => {
              const amount = plan.budget[cat];
              const pct = totalBudget > 0 ? (amount / totalBudget) * 100 : 0;
              const formattedPct = pct.toFixed(1);

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-foreground">
                      {CATEGORY_DISPLAY_NAMES[cat]}
                    </span>
                    <span className="text-muted">
                      <span className="font-semibold text-foreground">
                        ₹{amount.toLocaleString("en-IN")}
                      </span>{" "}
                      ({formattedPct}%)
                    </span>
                  </div>
                  {/* CSS progress track and bar */}
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full bg-background"
                    role="progressbar"
                    aria-valuenow={amount}
                    aria-valuemin={0}
                    aria-valuemax={totalBudget}
                    aria-label={`${CATEGORY_DISPLAY_NAMES[cat]}: ${formattedPct}%`}
                  >
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plain HTML Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Exact rupee allocations per celebration category
            </caption>
            <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 sm:px-6">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-right sm:px-6">
                  Share
                </th>
                <th scope="col" className="px-4 py-3 text-right sm:px-6">
                  Amount (INR)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {BUDGET_CATEGORIES.map((cat) => {
                const amount = plan.budget[cat];
                const pct =
                  totalBudget > 0
                    ? ((amount / totalBudget) * 100).toFixed(1)
                    : "0.0";
                return (
                  <tr
                    key={cat}
                    className="hover:bg-surface-hover/50 transition-colors"
                  >
                    <th scope="row" className="px-4 py-3 font-medium sm:px-6">
                      {CATEGORY_DISPLAY_NAMES[cat]}
                    </th>
                    <td className="px-4 py-3 text-right text-xs text-muted sm:px-6">
                      {pct}%
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground sm:px-6">
                      ₹{amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-border bg-background/80 font-bold text-foreground">
              <tr>
                <th scope="row" className="px-4 py-3.5 sm:px-6">
                  Total Budget
                </th>
                <td className="px-4 py-3.5 text-right text-xs text-muted sm:px-6">
                  100%
                </td>
                <td className="px-4 py-3.5 text-right text-base text-accent sm:px-6">
                  ₹{totalBudget.toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 3. Timeline Section & Interactive Task Controls */}
      <section aria-labelledby="timeline-heading" className="space-y-6">
        <header>
          <h2
            id="timeline-heading"
            className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            Planning Timeline
          </h2>
          <p className="mt-1 text-sm text-muted">
            Mark tasks complete, or delay by days to automatically cascade
            deadlines to dependent tasks.
          </p>
        </header>

        <ol
          className="relative space-y-4 border-l-2 border-border pl-6 sm:pl-8"
          aria-label="Chronological celebration task timeline"
        >
          {plan.timeline.map((task, idx) => {
            const isDone = task.status === "done";
            const delayValue = delayDaysMap[task.id] ?? 1;
            const taskError = taskErrors[task.id];
            const movedTitles = taskAdjustedNotes[task.id];

            return (
              <li key={task.id} className="relative">
                {/* Dot marker */}
                <span
                  className={`absolute -left-[31px] top-2 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-surface sm:-left-[39px] ${
                    isDone
                      ? "border-emerald-500 bg-emerald-500/20"
                      : task.compressed
                      ? "border-amber-400 bg-amber-400/20"
                      : "border-accent bg-background"
                  }`}
                  aria-hidden="true"
                >
                  {isDone && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
                </span>

                <article
                  className={`rounded-xl border bg-surface p-4 transition-colors ${
                    isDone
                      ? "border-emerald-500/30 bg-surface/70"
                      : "border-border hover:bg-surface-hover/60"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-muted">
                          #{idx + 1}
                        </span>

                        {/* Text label for task status (not color alone) */}
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted">
                            To-do
                          </span>
                        )}

                        {task.compressed && (
                          <span
                            className="inline-flex items-center rounded-full border border-amber-600/50 bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
                            title="Timeline lead time was compressed proportionally to fit before the event"
                          >
                            Compressed
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs font-medium text-foreground">
                          <Clock
                            className="h-3 w-3 text-accent"
                            aria-hidden="true"
                          />
                          Due {task.dueDate}
                        </span>
                      </div>

                      <h3
                        className={`mt-1.5 text-sm font-semibold ${
                          isDone
                            ? "text-muted line-through"
                            : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </h3>

                      {task.dependsOn.length > 0 && (
                        <p className="mt-1.5 text-xs text-muted">
                          Depends on:{" "}
                          <span className="font-medium text-foreground/90">
                            {task.dependsOn
                              .map((depId: string) => taskTitleMap.get(depId) ?? depId)
                              .join(", ")}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Task Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto no-print">
                      {/* Mark Done / To-do Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                          isDone
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            : "border-border bg-background text-foreground hover:bg-surface-hover"
                        }`}
                        aria-pressed={isDone}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{isDone ? "Mark as to-do" : "Mark done"}</span>
                      </button>

                      {/* Delay Control */}
                      {!isDone && (
                        <div className="flex items-center gap-1.5">
                          <label
                            htmlFor={`delay-${task.id}`}
                            className="sr-only"
                          >
                            Delay {task.title} by days
                          </label>
                          <input
                            id={`delay-${task.id}`}
                            type="number"
                            min={1}
                            max={30}
                            value={delayValue}
                            onChange={(e) =>
                              setDelayDaysMap((prev) => ({
                                ...prev,
                                [task.id]: Math.max(
                                  1,
                                  Math.min(30, Number(e.target.value) || 1)
                                ),
                              }))
                            }
                            aria-label={`Days to delay ${task.title}`}
                            className="w-14 rounded-lg border border-border bg-background py-1 px-2 text-center text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <button
                            type="button"
                            onClick={() => handleDelayTask(task.id)}
                            aria-label={`Delay ${task.title}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span>Delay</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Specific Error Notice */}
                  {taskError && (
                    <div
                      role="alert"
                      className="mt-3 flex items-start gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300 no-print"
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                      <span>{taskError}</span>
                    </div>
                  )}

                  {/* Dates Adjusted Note */}
                  {movedTitles && movedTitles.length > 0 && (
                    <div
                      role="status"
                      className="mt-3 flex items-start gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-300 no-print"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>
                        Dates adjusted: {movedTitles.join(", ")}
                      </span>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 4. Vendor Checklist Section */}
      <section aria-labelledby="vendor-heading" className="space-y-6">
        <header>
          <h2
            id="vendor-heading"
            className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            Vendor Action Checklists
          </h2>
          <p className="mt-1 text-sm text-muted">
            Practical requirements per vendor category. Check off items as you
            lock them in.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {plan.vendorChecklist.map((vendorGroup, vIdx) => {
            const completedCount = vendorGroup.items.filter((i) => i.done).length;
            const allDone =
              vendorGroup.items.length > 0 &&
              completedCount === vendorGroup.items.length;

            return (
              <div
                key={vendorGroup.vendor}
                className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-border/70 pb-3">
                    <h3 className="text-base font-bold capitalize text-foreground">
                      {vendorGroup.vendor} Checklist
                    </h3>
                    <span
                      className={`text-xs font-semibold ${
                        allDone ? "text-emerald-400 font-bold" : "text-muted"
                      }`}
                    >
                      {completedCount} / {vendorGroup.items.length} done
                    </span>
                  </div>

                  <ul className="mt-3.5 space-y-3">
                    {vendorGroup.items.map((item, iIdx) => {
                      const inputId = `chk-${vendorGroup.vendor}-${iIdx}`;
                      return (
                        <li key={item.label} className="flex items-start gap-2.5">
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={item.done}
                            onChange={() => toggleChecklistItem(vIdx, iIdx)}
                            className="mt-0.5 h-4 w-4 rounded border-border bg-background text-accent focus:ring-accent focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <label
                            htmlFor={inputId}
                            className={`text-xs leading-relaxed transition-colors cursor-pointer ${
                              item.done
                                ? "text-muted line-through"
                                : "text-foreground"
                            }`}
                          >
                            {item.label}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Theme Ideas & Celebration Notes */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Theme Ideas */}
        <section
          aria-labelledby="ideas-heading"
          className="rounded-xl border border-border bg-surface p-6 space-y-4"
        >
          <header className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 id="ideas-heading" className="text-lg font-bold text-foreground">
              Tailored Theme Ideas
            </h2>
          </header>

          <ol
            className="space-y-3.5 text-sm"
            aria-label="Celebration theme concepts"
          >
            {plan.ideas.map((idea, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-border/60 bg-background/50 p-3.5"
              >
                <span className="block text-xs font-bold uppercase tracking-wider text-accent">
                  Concept #{idx + 1}
                </span>
                <p className="mt-1 text-sm text-foreground">{idea}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Celebration Notes */}
        <section
          aria-labelledby="notes-heading"
          className="rounded-xl border border-border bg-surface p-6 space-y-4"
        >
          <header className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 id="notes-heading" className="text-lg font-bold text-foreground">
              Important Celebration Notes
            </h2>
          </header>

          <ul
            className="space-y-3 text-sm"
            aria-label="Celebration advisory notes"
          >
            {plan.notes.map((note, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-border/60 bg-background/50 p-3.5 text-xs sm:text-sm text-foreground/90 leading-relaxed"
              >
                {note}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Floating Chat Drawer */}
      <ChatDrawer />
    </div>
  );
}
