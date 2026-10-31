import { NextResponse } from "next/server";
import { z } from "zod";
import { planInputSchema } from "@/lib/schemas";
import { generateAiPlan, answerQuestion } from "@/lib/geminiService";

// Rate limiting in-memory store: IP -> { count, resetTime }
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_PAYLOAD_BYTES = 20_480; // ~20 KB

function cleanupRateLimitMap(now: number) {
  if (rateLimitMap.size > 1000) {
    for (const [ip, entry] of rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  cleanupRateLimitMap(now);

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

// Request validation schemas with capped string lengths
const planModeSchema = z.object({
  mode: z.literal("plan"),
  input: planInputSchema,
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const chatModeSchema = z.object({
  mode: z.literal("chat"),
  plan: z.any(),
  question: z
    .string()
    .trim()
    .min(1, "Question cannot be empty")
    .max(500, "Question is too long"),
});

// Legacy stub schema support for backward compatibility
const legacyStubSchema = z.object({
  eventName: z.string().min(1).max(120),
  budget: z.number().int().nonnegative(),
});

const requestSchema = z.union([
  planModeSchema,
  chatModeSchema,
  legacyStubSchema,
]);

/**
 * POST /api/gemini
 *
 * Server-only endpoint. Discriminated request body:
 * - { mode: "plan", input, today? }
 * - { mode: "chat", plan, question }
 *
 * Implements in-memory rate limiting, 20 KB payload limit, and robust error sanitization.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // 1. In-memory per-IP Rate Limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  // 2. Request body size check (~20 KB limit)
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "Payload too large. Maximum allowed request size is 20 KB." },
      { status: 413 }
    );
  }

  let rawBodyText: string;
  try {
    rawBodyText = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Unable to read request payload." },
      { status: 400 }
    );
  }

  if (rawBodyText.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "Payload too large. Maximum allowed request size is 20 KB." },
      { status: 413 }
    );
  }

  // 3. Parse and validate JSON
  let bodyJson: unknown;
  try {
    bodyJson = JSON.parse(rawBodyText);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON format." },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed: " +
          parsed.error.issues.map((i) => i.message).join(", "),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    // Mode: Plan generation
    if ("mode" in data && data.mode === "plan") {
      const today =
        data.today ||
        new Date().toISOString().slice(0, 10);

      const plan = await generateAiPlan(data.input, today);
      return NextResponse.json({
        success: true,
        plan,
      });
    }

    // Mode: Chat / Q&A
    if ("mode" in data && data.mode === "chat") {
      const answer = await answerQuestion(data.plan, data.question);
      return NextResponse.json({
        success: true,
        answer,
      });
    }

    // Legacy stub handler
    if ("eventName" in data && "budget" in data) {
      const stubPlan = [
        `🎉 Celebration Plan for "${data.eventName}"`,
        `💰 Budget: ₹${data.budget.toLocaleString("en-IN")}`,
        "🤖 AI Model: Available via /plan workspace",
      ].join("\n");

      return NextResponse.json({
        success: true,
        plan: stubPlan,
        model: "builtin",
      });
    }

    return NextResponse.json(
      { error: "Invalid request mode." },
      { status: 400 }
    );
  } catch {
    // Never leak stack traces, API keys, or raw upstream errors
    return NextResponse.json(
      { error: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
}
