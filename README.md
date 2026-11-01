# EventPilot 🎉

AI-powered celebration planner for budget-conscious Indian families — turn a few answers into an exact budget, a dated timeline, vendor checklists, and a plan you can revise on the fly.

Built for **PromptWars Virtual — Challenge 5** (Hack2Skill x Google for Developers).

**Live:** https://eventpilot-zeta.vercel.app
**Repo:** https://github.com/Shaurya2008-hub/eventpilot

---

## What it does

- **Guided 3-step form** — occasion, date, city, guests, budget, dietary/accessibility needs, with per-field validation (Zod)
- **Exact-rupee budget split** — largest-remainder method so category amounts always sum to the total exactly, with live sliders that rebalance the rest of the categories as you adjust one
- **Dated task timeline** — tasks with dependencies; marking one done or delaying it cascades the dependent deadlines automatically
- **"What If?" scenario planner** — change the total budget, guest count, or event date and the plan revises instantly (exact rebalancing, non-destructive to done tasks/checklist state), with a plain-English explanation of what changed and why, optionally enriched by a short AI-generated trade-off summary
- **Floating AI chat assistant** — ask free-form questions about your specific plan (budget, timeline, vendors); answers are grounded in your actual plan data, not generic advice
- **Vendor checklists** and **AI-personalized theme ideas/notes** tailored to occasion, city, and guest profile
- **Print view & .txt export** — a clean print stylesheet (hides interactive controls) plus a one-click plain-text summary download

## How it stays reliable

- Gemini is called **only from a server route** (`/api/gemini`) — the API key never reaches the browser
- **Model fallback chain** (`GEMINI_MODELS` env var): `gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.5-flash-lite`
- JSON schema validation on AI responses, one retry on invalid JSON, request timeouts, and basic rate limiting
- If every model fails, a **built-in rule-based planner** still produces a complete plan — clearly labelled as "Built-in" instead of "AI plan"
- AI only ever suggests category *weights* and *text* (theme ideas, notes, explanations) — all rupee amounts and dates are computed by deterministic code, never by the model

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript (strict mode)
- **Styling:** Tailwind CSS — dark theme, WCAG 2.1 AA contrast
- **State:** Zustand, persisted (plan + chat history survive a refresh, reset on "Start a new plan")
- **Validation:** Zod
- **Icons:** lucide-react
- **Tests:** Vitest — 98 tests across 9 test files

## Getting Started

```bash
# 1. Clone the repo
git clone <repo-url> && cd event-pilot

# 2. Install dependencies
npm install

# 3. Create your env file
cp .env.example .env.local
# Then add your GEMINI_API_KEY in .env.local

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000 in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests |

## Project Structure

src/
├── app/
│ ├── api/gemini/route.ts # Gemini proxy — chat + plan-generation modes, env access only here
│ ├── plan/page.tsx # Plan workspace
│ ├── layout.tsx # Root layout, a11y landmarks
│ ├── page.tsx # Landing page
│ ├── globals.css # Tailwind + dark theme tokens + print styles
│ └── components/
│ ├── GuidedPlanForm.tsx # 3-step validated intake form
│ ├── PlanView.tsx # Main plan workspace (budget, timeline, checklist, controls)
│ ├── WhatIfPanel.tsx # Scenario planner (budget/guest/date re-planning)
│ ├── ChatDrawer.tsx # Floating plan-aware AI assistant
│ └── FooterYear.tsx
├── lib/
│ ├── schemas.ts # Zod schemas
│ ├── budget.ts # Largest-remainder allocation, rebalancing
│ ├── timeline.ts # Dependency cascading (reflow)
│ ├── whatIf.ts # Scenario re-planning + explanation generation
│ ├── exportPlan.ts # Plain-text plan export
│ ├── planHelpers.ts # Shared plan utilities
│ ├── planClient.ts # Client-side API calls (plan gen + chat)
│ ├── geminiService.ts # Server-side Gemini client, fallback chain
│ └── fallbackPlanner.ts # Rule-based planner (used when AI fails)
└── store/
└── plan-store.ts # Zustand store (plan + chat history, persisted)

tests/
├── schemas.test.ts
├── budget.test.ts
├── timeline.test.ts
├── planHelpers.test.ts
├── fallback.test.ts
├── gemini.test.ts
├── whatIf.test.ts
├── exportPlan.test.ts
└── chatDrawer.test.ts


## Accessibility

- Semantic landmarks: `<header>`, `<main>`, `<footer>`
- Skip-to-content link for keyboard navigation
- Visible `:focus-visible` ring on all interactive elements
- Labelled form controls throughout (what-if inputs, chat input, print/export buttons)
- `aria-live="polite"` regions for what-if explanations and chat updates
- Chat history uses `role="log"` with `aria-label`; chat toggle uses `aria-expanded`/`aria-controls`
- Keyboard dismissal (Escape) on the chat drawer
- Dark theme meets WCAG 2.1 AA contrast ratio

## Security

- `GEMINI_API_KEY` is read only in server-side files (`geminiService.ts`, `/api/gemini/route.ts`) — never in any client component or bundle
- `.env.local` is gitignored; only `.env.example` (placeholder) is tracked

## Prompt Evolution

The app was built in Antigravity as a series of tested stages, not one mega-prompt:

1. **"Build everything at once"** (initial instinct) — rejected: agents miss edge cases
   (rounding, fallbacks, ARIA) in large prompts.
2. **Per-module prompts with a test gate** — each stage ended with `npm test` passing
   before the next began.
3. **Key constraint that shaped the budget engine:** *"Use the Largest-Remainder Method:
   floor each share, then give leftover rupees one each to the categories with the largest
   fractional remainders. The sum of all categories must equal totalBudget exactly."*
4. **Resilience approach:** model names are read from the `GEMINI_MODELS` env var, and
   any failure — 404, 429, 5xx, or timeout — triggers a fallback to the next model in
   the chain; if every model fails, the rule-based planner takes over and the plan is
   labelled accordingly.

This staged approach is why the repo has 98 tests and why the app keeps working even
when every AI call fails.

## License

MIT