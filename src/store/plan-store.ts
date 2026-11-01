import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Plan } from "@/lib/schemas";
import type { BudgetCategory } from "@/lib/budget";
import {
  applyBudgetChange,
  resetPlanBudget,
  toggleTaskStatus,
  delayTaskInPlan,
} from "@/lib/planHelpers";
import { applyWhatIf, type WhatIfInputs } from "@/lib/whatIf";

export interface PlanState {
  eventName: string;
  budget: number;
  plan: Plan | null;
  previousPlan: Plan | null;
  setEventName: (name: string) => void;
  setBudget: (amount: number) => void;
  setPlan: (plan: Plan | null) => void;
  updateCategoryBudget: (category: BudgetCategory, amount: number) => void;
  resetBudgetToSuggested: () => void;
  toggleTaskStatus: (taskId: string) => void;
  delayTask: (taskId: string, days: number) => { movedTitles: string[]; error?: string };
  toggleChecklistItem: (vendorIndex: number, itemIndex: number) => void;
  applyWhatIfChange: (inputs: WhatIfInputs, today: string) => { explanation: string; error?: string };
  undoWhatIf: () => boolean;
  reset: () => void;
  startNewPlan: () => void;
}

const initialState = {
  eventName: "",
  budget: 0,
  plan: null as Plan | null,
  previousPlan: null as Plan | null,
};

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setEventName: (name: string) => set({ eventName: name }),
      setBudget: (amount: number) => set({ budget: amount }),
      setPlan: (plan: Plan | null) => {
        if (!plan) {
          set({ plan: null, eventName: "", budget: 0 });
          return;
        }
        const safePlan: Plan = {
          ...plan,
          originalBudget: plan.originalBudget ?? { ...plan.budget },
        };
        set({
          plan: safePlan,
          eventName: `${safePlan.input.occasion} in ${safePlan.input.city}`,
          budget: safePlan.input.budget,
        });
      },
      updateCategoryBudget: (category: BudgetCategory, amount: number) =>
        set((state) => {
          if (!state.plan) return state;
          const updatedPlan = applyBudgetChange(state.plan, category, amount);
          return { plan: updatedPlan };
        }),
      resetBudgetToSuggested: () =>
        set((state) => {
          if (!state.plan) return state;
          const updatedPlan = resetPlanBudget(state.plan);
          return { plan: updatedPlan };
        }),
      toggleTaskStatus: (taskId: string) =>
        set((state) => {
          if (!state.plan) return state;
          const updatedPlan = toggleTaskStatus(state.plan, taskId);
          return { plan: updatedPlan };
        }),
      delayTask: (taskId: string, days: number) => {
        const state = get();
        if (!state.plan) {
          return { movedTitles: [], error: "No active plan" };
        }
        const result = delayTaskInPlan(state.plan, taskId, days);
        if (!result.error) {
          set({ plan: result.plan });
        }
        return {
          movedTitles: result.movedTaskTitles,
          error: result.error,
        };
      },
      toggleChecklistItem: (vendorIndex: number, itemIndex: number) =>
        set((state) => {
          if (!state.plan) return state;
          const updatedChecklist = state.plan.vendorChecklist.map(
            (vendorGroup, vIdx) => {
              if (vIdx !== vendorIndex) return vendorGroup;
              const updatedItems = vendorGroup.items.map((item, iIdx) => {
                if (iIdx !== itemIndex) return item;
                return { ...item, done: !item.done };
              });
              return { ...vendorGroup, items: updatedItems };
            }
          );
          return {
            plan: {
              ...state.plan,
              vendorChecklist: updatedChecklist,
            },
          };
        }),
      applyWhatIfChange: (inputs: WhatIfInputs, today: string) => {
        const state = get();
        if (!state.plan) {
          return { explanation: "", error: "No active plan" };
        }
        const result = applyWhatIf(state.plan, inputs, today);
        if (result.error) {
          return { explanation: "", error: result.error };
        }
        set({
          previousPlan: state.plan,
          plan: result.plan,
          eventName: `${result.plan.input.occasion} in ${result.plan.input.city}`,
          budget: result.plan.input.budget,
        });
        return { explanation: result.explanation };
      },
      undoWhatIf: () => {
        const state = get();
        if (!state.previousPlan) {
          return false;
        }
        set({
          plan: state.previousPlan,
          previousPlan: null,
          eventName: `${state.previousPlan.input.occasion} in ${state.previousPlan.input.city}`,
          budget: state.previousPlan.input.budget,
        });
        return true;
      },
      reset: () => set({ ...initialState }),
      startNewPlan: () => set({ ...initialState }),
    }),
    { name: "event-pilot-plan" }
  )
);
