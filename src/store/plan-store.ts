import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PlanState {
  eventName: string;
  budget: number;
  setEventName: (name: string) => void;
  setBudget: (amount: number) => void;
  reset: () => void;
}

const initialState = {
  eventName: "",
  budget: 0,
} as const;

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      ...initialState,
      setEventName: (name: string) => set({ eventName: name }),
      setBudget: (amount: number) => set({ budget: amount }),
      reset: () => set({ ...initialState }),
    }),
    { name: "event-pilot-plan" },
  ),
);

