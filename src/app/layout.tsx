import type { Metadata } from "next";
import "./globals.css";
import { FooterYear } from "@/components/FooterYear";

export const metadata: Metadata = {
  title: "EventPilot — AI Celebration Planner",
  description:
    "Plan unforgettable celebrations on a budget with AI-powered suggestions tailored for Indian families.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {/* Skip-to-content for keyboard / screen-reader users */}
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>

        <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <a
              href="/"
              className="text-lg font-bold tracking-tight text-accent"
            >
              🎉 EventPilot
            </a>
            <nav aria-label="Main navigation">
              <ul className="flex gap-6 text-sm font-medium">
                <li>
                  <a
                    href="/"
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="/plan"
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Plan
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          <p>
            &copy; <FooterYear /> EventPilot &mdash; Made with ❤️ for budget-conscious
            Indian families
          </p>
        </footer>
      </body>
    </html>
  );
}
