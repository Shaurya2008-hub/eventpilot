import { PartyPopper, IndianRupee, Sparkles } from "lucide-react";

const features = [
  {
    icon: PartyPopper,
    title: "Celebration Planning",
    description:
      "From mehendi to mundan, get a dated plan, an exact budget and vendor checklists, with AI suggestions when available.",
  },
  {
    icon: IndianRupee,
    title: "Budget Friendly",
    description:
      "Set your budget and let EventPilot optimise every rupee so you celebrate big without overspending.",
  },
  {
    icon: Sparkles,
    title: "Cultural Context",
    description:
      "Tailored for Indian families — festivals, weddings, pujas, birthdays, and more.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Plan Celebrations,{" "}
          <span className="text-accent">Not Stress</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          EventPilot is your AI-powered celebration planner built for
          budget-conscious Indian families. From{" "}
          <em>mehendi</em> to <em>mundan</em>, we&apos;ve got you covered.
        </p>
        <a
          href="/plan"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Start Planning
        </a>
      </section>

      {/* Features */}
      <section className="mt-20 grid gap-8 sm:grid-cols-3" aria-label="Features">
        {features.map(({ icon: Icon, title, description }) => (
          <article
            key={title}
            className="rounded-xl border border-border bg-surface p-6 transition-colors hover:bg-surface-hover"
          >
            <Icon
              className="mb-3 h-8 w-8 text-accent"
              aria-hidden="true"
            />
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
