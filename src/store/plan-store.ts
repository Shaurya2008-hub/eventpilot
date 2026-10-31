import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Plan } from "@/lib/schemas";

export interface PlanState {
  eventName: string;
  budget: number;
  plan: Plan | null;
  setEventName: (name: string) => void;
  setBudget: (amount: number) => void;
  setPlan: (plan: Plan | null) => void;
  toggleChecklistItem: (vendorIndex: number, itemIndex: number) => void;
  reset: () => void;
  startNewPlan: () => void;
}

const initialState = {
  eventName: "",
  budget: 0,
  plan: null,
};

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      ...initialState,
      setEventName: (name: string) => set({ eventName: name }),
      setBudget: (amount: number) => set({ budget: amount }),
      setPlan: (plan: Plan | null) =>
        set({
          plan,
          eventName: plan ? `${plan.input.occasion} in ${plan.input.city}` : "",
          budget: plan ? plan.input.budget : 0,
        }),
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
      reset: () => set({ ...initialState }),
      startNewPlan: () => set({ ...initialState }),
    }),
    { name: "event-pilot-plan" }
  )
);
