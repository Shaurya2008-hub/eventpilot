import { NextResponse } from "next/server";
import { geminiRequestSchema } from "@/lib/schemas";
import type { GeminiResponse } from "@/lib/schemas";

/**
 * POST /api/gemini
 *
 * This is the ONLY file allowed to read process.env.GEMINI_API_KEY.
 * Returns a stub JSON response for now.
 */
export async function POST(request: Request): Promise<NextResponse<GeminiResponse | { error: string }>> {
  // ------- env access (sole file) -------
  const apiKey = process.env.GEMINI_API_KEY;
  const modelsRaw = process.env.GEMINI_MODELS ?? "";
  const models = modelsRaw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  // ------- validate body -------
  const body: unknown = await request.json();
  const parsed = geminiRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const { eventName, budget } = parsed.data;
  const selectedModel = models[0] ?? "gemini-3.8-flash";

  // ------- stub response (replace with real Gemini call later) -------
  const stubPlan = [
    `🎉 Celebration Plan for "${eventName}"`,
    `💰 Budget: ₹${budget.toLocaleString("en-IN")}`,
    `🤖 Model: ${selectedModel}`,
    "",
    "This is a stub response. Connect the Gemini API to generate a real plan!",
  ].join("\n");

  return NextResponse.json({
    success: true,
    plan: stubPlan,
    model: selectedModel,
  });
}

