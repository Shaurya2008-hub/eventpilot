"use client";

import { useState, useEffect } from "react";
import { usePlanStore } from "@/store/plan-store";
import { getLocalTodayString } from "./GuidedPlanForm";
import {
  buildChangeSummary,
  fetchAiExplanation,
} from "@/lib/whatIf";
import {
  HelpCircle,
  Undo2,
  Sparkles,
  AlertCircle,
  IndianRupee,
  Users,
  Calendar,
  Check,
} from "lucide-react";

export function WhatIfPanel() {
  const plan = usePlanStore((s) => s.plan);
  const previousPlan = usePlanStore((s) => s.previousPlan);
  const applyWhatIfChange = usePlanStore((s) => s.applyWhatIfChange);
  const undoWhatIf = usePlanStore((s) => s.undoWhatIf);

  const [budgetInput, setBudgetInput] = useState<string>("");
  const [guestsInput, setGuestsInput] = useState<string>("");
  const [dateInput, setDateInput] = useState<string>("");

  const [error, setError] = useState<string>("");
  const [localExplanation, setLocalExplanation] = useState<string>("");
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Sync inputs with active plan
  useEffect(() => {
    if (plan) {
      setBudgetInput(String(plan.input.budget));
      setGuestsInput(String(plan.input.guests));
      setDateInput(plan.input.eventDate);
    }
  }, [plan?.input.budget, plan?.input.guests, plan?.input.eventDate]);

  if (!plan) return null;

  const handleApply = () => {
    setError("");
    const parsedBudget = Number(budgetInput);
    const parsedGuests = Number(guestsInput);
    const trimmedDate = dateInput.trim();

    if (!Number.isInteger(parsedBudget) || parsedBudget <= 0) {
      setError("Please enter a valid positive integer for budget.");
      return;
    }

    if (
      !Number.isInteger(parsedGuests) ||
      parsedGuests < 1 ||
      parsedGuests > 5000
    ) {
      setError("Guest count must be an integer between 1 and 5,000.");
      return;
    }

    if (!trimmedDate) {
      setError("Please select an event date.");
      return;
    }

    const today = getLocalTodayString();
    const beforePlan = plan;

    const result = applyWhatIfChange(
      {
        newBudget: parsedBudget,
        newGuests: parsedGuests,
        newEventDate: trimmedDate,
      },
      today
    );

    if (result.error) {
      setError(result.error);
      return;
    }

    setLocalExplanation(result.explanation);
    setAiExplanation(null);

    // If there were changes, attempt AI explanation enhancement asynchronously
    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan && result.explanation && result.explanation !== "No changes detected") {
      const summary = buildChangeSummary(beforePlan, currentPlan);
      setIsAiLoading(true);

      // Async enhancement with 10s ceiling; fails silently without blocking UI
      fetchAiExplanation(currentPlan, summary)
        .then((aiAnswer) => {
          if (aiAnswer) {
            setAiExplanation(aiAnswer);
          }
        })
        .catch(() => {
          // Keep local explanation silently
        })
        .finally(() => {
          setIsAiLoading(false);
        });
    }
  };

  const handleUndo = () => {
    setError("");
    const restored = undoWhatIf();
    if (restored) {
      setLocalExplanation("Restored previous plan allocations and timeline.");
      setAiExplanation(null);
      setIsAiLoading(false);
    }
  };

  const hasPreviousPlan = Boolean(previousPlan);

  return (
    <section
      aria-labelledby="what-if-heading"
      className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8 space-y-6"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="what-if-heading"
              className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
            >
              &ldquo;What If?&rdquo; Scenario Planner
            </h2>
            <p className="text-xs text-muted">
              Simulate budget changes, guest variations, or date shifts without
              losing your customizations.
            </p>
          </div>
        </div>

        {/* Undo Button */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={!hasPreviousPlan}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
            hasPreviousPlan
              ? "border-border bg-background text-foreground hover:bg-surface-hover"
              : "border-border/40 bg-background/40 text-muted/50 cursor-not-allowed"
          }`}
          aria-label="Undo last change"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Undo last change</span>
        </button>
      </header>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* New Total Budget */}
        <div className="space-y-1.5">
          <label
            htmlFor="what-if-budget"
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
          >
            <IndianRupee className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            New Total Budget (₹)
          </label>
          <input
            id="what-if-budget"
            type="number"
            min={1000}
            step={1000}
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="New total budget in rupees"
          />
        </div>

        {/* New Guest Count */}
        <div className="space-y-1.5">
          <label
            htmlFor="what-if-guests"
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
          >
            <Users className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            New Guest Count
          </label>
          <input
            id="what-if-guests"
            type="number"
            min={1}
            max={5000}
            step={1}
            value={guestsInput}
            onChange={(e) => setGuestsInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="New guest count"
          />
        </div>

        {/* New Event Date */}
        <div className="space-y-1.5">
          <label
            htmlFor="what-if-date"
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
          >
            <Calendar className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            New Event Date
          </label>
          <input
            id="what-if-date"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="New event date"
          />
        </div>
      </div>

      {/* Action Buttons & Inline Error */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={handleApply}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          <span>Apply changes</span>
        </button>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-1.5 text-xs font-medium text-rose-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Immediate and Enhanced Explanation Display in aria-live region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-2 text-xs sm:text-sm"
      >
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
          <span>Change Summary</span>
          {isAiLoading && (
            <span className="flex items-center gap-1 text-[11px] font-normal text-purple-400">
              <Sparkles className="h-3 w-3 animate-spin" aria-hidden="true" />
              Analyzing trade-offs...
            </span>
          )}
        </div>

        {localExplanation ? (
          <p className="font-mono text-foreground leading-relaxed">
            {localExplanation}
          </p>
        ) : (
          <p className="text-muted italic">
            Enter test values above and click &ldquo;Apply changes&rdquo; to
            preview the impact on your celebration budget and timeline.
          </p>
        )}

        {/* AI-enhanced trade-off explanation */}
        {aiExplanation && (
          <div className="mt-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-xs sm:text-sm text-purple-200">
            <div className="flex items-center gap-1.5 font-semibold text-purple-300 mb-1">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>AI Trade-off Insight</span>
            </div>
            <p className="leading-relaxed">{aiExplanation}</p>
          </div>
        )}
      </div>
    </section>
  );
}
