"use client";

import { useEffect, useState } from "react";
import { usePlanStore } from "@/store/plan-store";
import { GuidedPlanForm } from "@/components/GuidedPlanForm";
import { PlanView } from "@/components/PlanView";
import { Sparkles, ArrowRight, RotateCcw } from "lucide-react";

export default function PlanPage() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const plan = usePlanStore((s) => s.plan);
  const startNewPlan = usePlanStore((s) => s.startNewPlan);
  const [mode, setMode] = useState<"prompt" | "view" | "form">("prompt");

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // When no plan exists, open the guided form
  useEffect(() => {
    if (hasHydrated && !plan) {
      setMode("form");
    }
  }, [hasHydrated, plan]);

  // When a plan is newly set, immediately switch to the plan view
  useEffect(() => {
    if (plan && mode === "form") {
      setMode("view");
    }
  }, [plan, mode]);

  if (!hasHydrated) {
    return (
      <div className="mx-auto flex min-h-[400px] max-w-2xl items-center justify-center p-8">
        <p className="text-sm text-muted">Loading your celebration workspace…</p>
      </div>
    );
  }

  // If a saved plan exists and user enters /plan, present Continue / Start new options
  if (plan && mode === "prompt") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome Back to EventPilot
        </h1>
        <p className="mt-2 text-sm text-muted">
          You have an existing celebration plan saved for{" "}
          <strong className="text-foreground capitalize">
            {plan.input.occasion} in {plan.input.city}
          </strong>{" "}
          ({plan.input.eventDate}).
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setMode("view")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            <span>Continue my plan</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              startNewPlan();
              setMode("form");
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Start a new plan</span>
          </button>
        </div>
      </div>
    );
  }

  if (plan && mode === "view") {
    return <PlanView />;
  }

  return <GuidedPlanForm />;
}
