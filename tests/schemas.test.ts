import { describe, it, expect } from "vitest";
import { geminiRequestSchema } from "@/lib/schemas";

describe("geminiRequestSchema", () => {
  it("accepts a valid event request", () => {
    const result = geminiRequestSchema.safeParse({
      eventName: "Diwali Party",
      budget: 25000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty event name", () => {
    const result = geminiRequestSchema.safeParse({
      eventName: "",
      budget: 10000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative budget", () => {
    const result = geminiRequestSchema.safeParse({
      eventName: "Birthday",
      budget: -500,
    });
    expect(result.success).toBe(false);
  });
});

