# EventPilot 🎉

> AI-powered celebration planner for budget-conscious Indian families.

## Tech Stack

- **Framework**: Next.js (App Router) with TypeScript (strict mode)
- **Styling**: Tailwind CSS — dark theme with AA-contrast colours
- **State**: Zustand (persisted to `localStorage`)
- **Validation**: Zod
- **Icons**: lucide-react
- **Tests**: Vitest

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

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start dev server             |
| `npm run build` | Production build             |
| `npm run start` | Serve production build       |
| `npm run lint`  | Run ESLint                   |
| `npm test`      | Run Vitest tests             |

## Project Structure

```
src/
├── app/
│   ├── api/gemini/route.ts   # Gemini API proxy (env access here only)
│   ├── plan/page.tsx         # /plan workspace
│   ├── layout.tsx            # Root layout with a11y landmarks
│   ├── page.tsx              # Landing page
│   └── globals.css           # Tailwind + dark theme tokens
├── lib/
│   └── schemas.ts            # Zod schemas
└── store/
    └── plan-store.ts         # Zustand store (persisted)
tests/
└── schemas.test.ts           # Placeholder + validation tests
```

## Accessibility

- Semantic landmarks: `<header>`, `<main>`, `<footer>`
- Skip-to-content link for keyboard navigation
- Visible `:focus-visible` ring on all interactive elements
- Dark theme meets WCAG 2.1 AA contrast ratio

## License

MIT
