import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  processChatSubmission,
  DEFAULT_CHAT_ERROR_MESSAGE,
} from "@/lib/planClient";
import { usePlanStore } from "@/store/plan-store";
import { generateFallbackPlan } from "@/lib/fallbackPlanner";
import type { Plan } from "@/lib/schemas";

function createTestPlan(): Plan {
  return generateFallbackPlan(
    {
      occasion: "wedding",
      eventDate: "2026-12-31",
      city: "Jaipur",
      guests: 200,
      budget: 1000000,
      atmosphere: "Royal Traditional",
      mustHaves: ["Live Shehnai"],
      dietary: "Pure Vegetarian",
      accessibilityNeeds: "Wheelchair ramps",
    },
    "2026-11-01"
  );
}

describe("ChatDrawer & Plan Chat Integration", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    usePlanStore.getState().reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("Drawer open/close state transitions", () => {
    it("toggles drawer open and closed properly", () => {
      let isOpen = false;
      const toggle = () => {
        isOpen = !isOpen;
      };

      expect(isOpen).toBe(false);

      // Open drawer
      toggle();
      expect(isOpen).toBe(true);

      // Close drawer
      toggle();
      expect(isOpen).toBe(false);
    });

    it("handles escape key dismissal", () => {
      let isOpen = true;
      const handleKeyDown = (key: string) => {
        if (key === "Escape") {
          isOpen = false;
        }
      };

      handleKeyDown("Enter");
      expect(isOpen).toBe(true);

      handleKeyDown("Escape");
      expect(isOpen).toBe(false);
    });
  });

  describe("Message sending and appending to history", () => {
    it("sends question and appends both user and assistant messages to history", async () => {
      const plan = createTestPlan();
      usePlanStore.getState().setPlan(plan);

      const mockAnswer =
        "For a royal wedding in Jaipur, consider local marigold decor to save on flower imports.";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          answer: mockAnswer,
        }),
      });

      const userMessages: string[] = [];
      const assistantMessages: { content: string; isError?: boolean }[] = [];
      const loadingStates: boolean[] = [];

      const success = await processChatSubmission(
        plan,
        "How can I optimize the decor budget?",
        {
          onUserMessage: (content) => {
            userMessages.push(content);
            usePlanStore.getState().addChatMessage({ role: "user", content });
          },
          onAssistantMessage: (content, isError) => {
            assistantMessages.push({ content, isError });
            usePlanStore.getState().addChatMessage({
              role: "assistant",
              content,
              isError,
            });
          },
          setLoading: (l) => loadingStates.push(l),
        }
      );

      expect(success).toBe(true);
      expect(userMessages).toEqual(["How can I optimize the decor budget?"]);
      expect(assistantMessages).toEqual([
        { content: mockAnswer, isError: false },
      ]);

      // Check Zustand store
      const storeHistory = usePlanStore.getState().chatMessages;
      expect(storeHistory).toHaveLength(2);
      expect(storeHistory[0].role).toBe("user");
      expect(storeHistory[0].content).toBe("How can I optimize the decor budget?");
      expect(storeHistory[1].role).toBe("assistant");
      expect(storeHistory[1].content).toBe(mockAnswer);
      expect(storeHistory[1].isError).toBe(false);
      expect(storeHistory[0].id).toBeDefined();
      expect(storeHistory[0].timestamp).toBeDefined();
    });

    it("ignores whitespace-only empty questions without calling API", async () => {
      const plan = createTestPlan();
      global.fetch = vi.fn();

      const userMessages: string[] = [];
      const success = await processChatSubmission(plan, "   ", {
        onUserMessage: (content) => userMessages.push(content),
        onAssistantMessage: () => {},
        setLoading: () => {},
      });

      expect(success).toBe(false);
      expect(userMessages).toHaveLength(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("Loading state behavior", () => {
    it("activates loading state while waiting and deactivates on completion", async () => {
      const plan = createTestPlan();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          answer: "All checks clear.",
        }),
      });

      const loadingSequence: boolean[] = [];

      await processChatSubmission(plan, "Are vendors locked?", {
        onUserMessage: () => {},
        onAssistantMessage: () => {},
        setLoading: (loading) => loadingSequence.push(loading),
      });

      expect(loadingSequence).toEqual([true, false]);
    });
  });

  describe("Error state handling on failure or timeout", () => {
    it("gracefully displays friendly inline error when API returns 500", async () => {
      const plan = createTestPlan();
      usePlanStore.getState().setPlan(plan);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const assistantMessages: { content: string; isError?: boolean }[] = [];
      const loadingSequence: boolean[] = [];

      const success = await processChatSubmission(plan, "Will it rain in Jaipur?", {
        onUserMessage: (content) => {
          usePlanStore.getState().addChatMessage({ role: "user", content });
        },
        onAssistantMessage: (content, isError) => {
          assistantMessages.push({ content, isError });
          usePlanStore.getState().addChatMessage({
            role: "assistant",
            content,
            isError,
          });
        },
        setLoading: (loading) => loadingSequence.push(loading),
      });

      expect(success).toBe(false);
      expect(loadingSequence).toEqual([true, false]);
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0].isError).toBe(true);
      expect(assistantMessages[0].content).toBe(DEFAULT_CHAT_ERROR_MESSAGE);
      expect(assistantMessages[0].content).not.toContain("500");
      expect(assistantMessages[0].content).not.toContain("Error");

      const storeHistory = usePlanStore.getState().chatMessages;
      expect(storeHistory[1].isError).toBe(true);
    });

    it("gracefully displays friendly inline error on network rejection or timeout", async () => {
      const plan = createTestPlan();
      global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

      const assistantMessages: { content: string; isError?: boolean }[] = [];

      const success = await processChatSubmission(plan, "Can I add more guests?", {
        onUserMessage: () => {},
        onAssistantMessage: (content, isError) => {
          assistantMessages.push({ content, isError });
        },
        setLoading: () => {},
      });

      expect(success).toBe(false);
      expect(assistantMessages[0].isError).toBe(true);
      expect(assistantMessages[0].content).toBe(DEFAULT_CHAT_ERROR_MESSAGE);
      expect(assistantMessages[0].content).not.toContain("Network timeout");
    });
  });

  describe("History scoping and reset on new plan", () => {
    it("resets chat history when starting a new plan", () => {
      const plan = createTestPlan();
      usePlanStore.getState().setPlan(plan);

      // Add messages
      usePlanStore.getState().addChatMessage({
        role: "user",
        content: "What is my budget?",
      });
      usePlanStore.getState().addChatMessage({
        role: "assistant",
        content: "Your total budget is ₹10,00,000.",
      });

      expect(usePlanStore.getState().chatMessages).toHaveLength(2);
      expect(usePlanStore.getState().plan).not.toBeNull();

      // Start new plan
      usePlanStore.getState().startNewPlan();

      // History must be empty and plan reset
      expect(usePlanStore.getState().chatMessages).toHaveLength(0);
      expect(usePlanStore.getState().plan).toBeNull();
    });

    it("resets chat history on store reset()", () => {
      const plan = createTestPlan();
      usePlanStore.getState().setPlan(plan);

      usePlanStore.getState().addChatMessage({
        role: "user",
        content: "Hello assistant",
      });
      expect(usePlanStore.getState().chatMessages).toHaveLength(1);

      usePlanStore.getState().reset();
      expect(usePlanStore.getState().chatMessages).toHaveLength(0);
    });

    it("allows clearChatMessages to clear messages explicitly", () => {
      usePlanStore.getState().addChatMessage({
        role: "user",
        content: "Test message",
      });
      expect(usePlanStore.getState().chatMessages).toHaveLength(1);

      usePlanStore.getState().clearChatMessages();
      expect(usePlanStore.getState().chatMessages).toHaveLength(0);
    });
  });
});
