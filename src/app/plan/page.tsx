"use client";

import { Send } from "lucide-react";
import { usePlanStore } from "@/store/plan-store";
import { useState } from "react";

export default function PlanPage() {
  const { eventName, budget, setEventName, setBudget, reset } = usePlanStore();
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const handleGenerate = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName, budget }),
      });
      if (!res.ok) throw new Error("API request failed");
      // Future: parse and display AI suggestions
      setStatus("done");
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Plan Your Event</h1>
      <p className="mt-2 text-sm text-muted">
        Fill in the details and let AI craft your celebration plan.
      </p>

      <form
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void handleGenerate();
        }}
      >
        {/* Event name */}
        <div>
          <label
            htmlFor="event-name"
            className="block text-sm font-medium text-foreground"
          >
            Event Name
          </label>
          <input
            id="event-name"
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g. Diwali Party, Haldi Ceremony"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>

        {/* Budget */}
        <div>
          <label
            htmlFor="budget"
            className="block text-sm font-medium text-foreground"
          >
            Budget (₹)
          </label>
          <input
            id="budget"
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            placeholder="e.g. 25000"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {status === "loading" ? "Generating…" : "Generate Plan"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
          >
            Reset
          </button>
        </div>

        {status === "done" && (
          <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            ✅ Plan generated! (AI integration coming soon)
          </p>
        )}
      </form>
    </div>
  );
}

