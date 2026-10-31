"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { generateFallbackPlan } from "@/lib/fallbackPlanner";
import { createPlanInputSchema, type PlanInput } from "@/lib/schemas";
import { usePlanStore } from "@/store/plan-store";
import type { Occasion } from "@/lib/budget";

/**
 * Returns local calendar date formatted as YYYY-MM-DD
 * built strictly from getFullYear, getMonth, and getDate (not toISOString).
 */
export function getLocalTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function GuidedPlanForm() {
  const setPlan = usePlanStore((s) => s.setPlan);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const today = getLocalTodayString();

  const [formData, setFormData] = useState<{
    occasion: Occasion;
    eventDate: string;
    city: string;
    guests: string;
    budget: string;
    atmosphere: string;
    mustHavesText: string;
    dietary: string;
    accessibilityNeeds: string;
  }>({
    occasion: "wedding",
    eventDate: "",
    city: "",
    guests: "200",
    budget: "500000",
    atmosphere: "",
    mustHavesText: "",
    dietary: "",
    accessibilityNeeds: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Re-validates a field as it changes and clears its error as soon as it becomes valid.
   * A valid field never shows an error.
   */
  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    const schema = createPlanInputSchema(today);
    let errorMsg = "";

    switch (field) {
      case "occasion": {
        const res = schema.shape.occasion.safeParse(value);
        if (!res.success) {
          errorMsg = "Please select a valid celebration occasion.";
        }
        break;
      }
      case "eventDate": {
        if (!value) {
          errorMsg = "Please choose a celebration date.";
        } else {
          const res = schema.shape.eventDate.safeParse(value);
          if (!res.success) {
            errorMsg = `Event date must be strictly after today (${today}).`;
          }
        }
        break;
      }
      case "city": {
        const res = schema.shape.city.safeParse(value);
        if (!res.success) {
          errorMsg = "City name is required.";
        }
        break;
      }
      case "guests": {
        const num = Number(value);
        if (!value || isNaN(num)) {
          errorMsg = "Please enter the number of guests.";
        } else {
          const res = schema.shape.guests.safeParse(num);
          if (!res.success) {
            errorMsg =
              "Guest count must be a whole number between 1 and 5,000.";
          }
        }
        break;
      }
      case "budget": {
        const num = Number(value);
        if (!value || isNaN(num)) {
          errorMsg = "Please enter your total budget in INR.";
        } else {
          const res = schema.shape.budget.safeParse(num);
          if (!res.success) {
            errorMsg = "Budget must be a positive whole number in ₹ INR.";
          }
        }
        break;
      }
      case "atmosphere": {
        const res = schema.shape.atmosphere.safeParse(value);
        if (!res.success) {
          errorMsg =
            "Atmosphere description must be at most 100 characters.";
        }
        break;
      }
      case "mustHavesText": {
        const parsed = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        const res = schema.shape.mustHaves.safeParse(parsed);
        if (!res.success) {
          errorMsg =
            "Maximum 10 items, and each must-have must be under 80 characters.";
        }
        break;
      }
      case "dietary": {
        const res = schema.shape.dietary.safeParse(value);
        if (!res.success) {
          errorMsg = "Dietary notes must be at most 100 characters.";
        }
        break;
      }
      case "accessibilityNeeds": {
        const res = schema.shape.accessibilityNeeds.safeParse(value);
        if (!res.success) {
          errorMsg =
            "Accessibility needs description must be at most 150 characters.";
        }
        break;
      }
    }

    setErrors((prev) => {
      // Clear error immediately when field is valid
      if (!errorMsg) {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }
      // If field already had an error or is invalid, reflect the current error
      if (prev[field]) {
        return { ...prev, [field]: errorMsg };
      }
      return prev;
    });
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const schema = createPlanInputSchema(today);

    // Validate occasion
    const occasionResult = schema.shape.occasion.safeParse(formData.occasion);
    if (!occasionResult.success) {
      newErrors.occasion = "Please select a valid celebration occasion.";
    }

    // Validate eventDate
    if (!formData.eventDate) {
      newErrors.eventDate = "Please choose a celebration date.";
    } else {
      const dateResult = schema.shape.eventDate.safeParse(formData.eventDate);
      if (!dateResult.success) {
        newErrors.eventDate = `Event date must be strictly after today (${today}).`;
      }
    }

    // Validate city
    const cityResult = schema.shape.city.safeParse(formData.city);
    if (!cityResult.success) {
      newErrors.city = "City name is required.";
    }

    // Validate guests
    const guestNum = Number(formData.guests);
    if (!formData.guests || isNaN(guestNum)) {
      newErrors.guests = "Please enter the number of guests.";
    } else {
      const guestResult = schema.shape.guests.safeParse(guestNum);
      if (!guestResult.success) {
        newErrors.guests =
          "Guest count must be a whole number between 1 and 5,000.";
      }
    }

    // Validate budget
    const budgetNum = Number(formData.budget);
    if (!formData.budget || isNaN(budgetNum)) {
      newErrors.budget = "Please enter your total budget in INR.";
    } else {
      const budgetResult = schema.shape.budget.safeParse(budgetNum);
      if (!budgetResult.success) {
        newErrors.budget = "Budget must be a positive whole number in ₹ INR.";
      }
    }

    setErrors(newErrors);

    const firstField = Object.keys(newErrors)[0];
    if (firstField) {
      document.getElementById(firstField)?.focus();
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const schema = createPlanInputSchema(today);

    // Validate atmosphere
    const atmResult = schema.shape.atmosphere.safeParse(formData.atmosphere);
    if (!atmResult.success) {
      newErrors.atmosphere =
        "Atmosphere description must be at most 100 characters.";
    }

    // Validate must-haves
    const parsedMustHaves = formData.mustHavesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const mustHavesResult = schema.shape.mustHaves.safeParse(parsedMustHaves);
    if (!mustHavesResult.success) {
      newErrors.mustHavesText =
        "Maximum 10 items, and each must-have must be under 80 characters.";
    }

    // Validate dietary
    const dietaryResult = schema.shape.dietary.safeParse(formData.dietary);
    if (!dietaryResult.success) {
      newErrors.dietary = "Dietary notes must be at most 100 characters.";
    }

    // Validate accessibility
    const accessResult = schema.shape.accessibilityNeeds.safeParse(
      formData.accessibilityNeeds
    );
    if (!accessResult.success) {
      newErrors.accessibilityNeeds =
        "Accessibility needs description must be at most 150 characters.";
    }

    setErrors(newErrors);

    const firstField = Object.keys(newErrors)[0];
    if (firstField) {
      document.getElementById(firstField)?.focus();
      return false;
    }
    return true;
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setErrors({});
      setStep(2);
    }
  };

  const handleNextFromStep2 = () => {
    if (validateStep2()) {
      setErrors({});
      setStep(3);
    }
  };

  const handleBackToStep1 = () => {
    // Clear step errors when going Back
    setErrors({});
    setStep(1);
  };

  const handleBackToStep2 = () => {
    // Clear step errors when going Back
    setErrors({});
    setStep(2);
  };

  const handleCreatePlan = () => {
    const mustHaves = formData.mustHavesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const planInput: PlanInput = {
      occasion: formData.occasion,
      eventDate: formData.eventDate,
      city: formData.city.trim(),
      guests: Number(formData.guests),
      budget: Number(formData.budget),
      atmosphere: formData.atmosphere.trim(),
      mustHaves,
      dietary: formData.dietary.trim(),
      accessibilityNeeds: formData.accessibilityNeeds.trim(),
    };

    const generated = generateFallbackPlan(planInput, today);
    setPlan(generated);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Progress tracker */}
      <nav aria-label="Planning steps" className="mb-8">
        <ol className="flex items-center justify-between gap-2 border-b border-border pb-4 text-xs font-semibold sm:text-sm">
          <li
            className={`flex items-center gap-2 ${
              step >= 1 ? "text-accent" : "text-muted"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                step >= 1
                  ? "bg-accent text-background font-bold"
                  : "border border-border text-muted"
              }`}
            >
              1
            </span>
            <span>Event Basics</span>
          </li>
          <li
            className={`flex items-center gap-2 ${
              step >= 2 ? "text-accent" : "text-muted"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                step >= 2
                  ? "bg-accent text-background font-bold"
                  : "border border-border text-muted"
              }`}
            >
              2
            </span>
            <span>Preferences</span>
          </li>
          <li
            className={`flex items-center gap-2 ${
              step >= 3 ? "text-accent" : "text-muted"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                step >= 3
                  ? "bg-accent text-background font-bold"
                  : "border border-border text-muted"
              }`}
            >
              3
            </span>
            <span>Review</span>
          </li>
        </ol>
      </nav>

      {/* Step 1: Event Basics */}
      {step === 1 && (
        <section aria-labelledby="step1-heading" className="space-y-6">
          <header>
            <h2 id="step1-heading" className="text-2xl font-bold tracking-tight">
              Step 1: Event Basics
            </h2>
            <p className="mt-1 text-sm text-muted">
              Tell us the core details of your celebration.
            </p>
          </header>

          <div className="space-y-5">
            {/* Occasion */}
            <div>
              <label
                htmlFor="occasion"
                className="block text-sm font-medium text-foreground"
              >
                Occasion <span className="text-accent">*</span>
              </label>
              <select
                id="occasion"
                value={formData.occasion}
                onChange={(e) => handleFieldChange("occasion", e.target.value)}
                aria-invalid={!!errors.occasion}
                aria-describedby={errors.occasion ? "occasion-error" : undefined}
                className={`mt-1 w-full rounded-lg border bg-surface px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  errors.occasion ? "border-destructive ring-1 ring-destructive" : "border-border"
                }`}
              >
                <option value="wedding">Wedding (Vivah)</option>
                <option value="birthday">Birthday Celebration</option>
                <option value="engagement">Engagement (Roka / Sagai)</option>
                <option value="community">Community Gathering / Pooja</option>
              </select>
              {errors.occasion && (
                <p
                  id="occasion-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {errors.occasion}
                </p>
              )}
            </div>

            {/* Event Date */}
            <div>
              <label
                htmlFor="eventDate"
                className="block text-sm font-medium text-foreground"
              >
                Event Date <span className="text-accent">*</span>
              </label>
              <input
                id="eventDate"
                type="date"
                value={formData.eventDate}
                onChange={(e) => handleFieldChange("eventDate", e.target.value)}
                aria-invalid={!!errors.eventDate}
                aria-describedby={
                  errors.eventDate ? "eventDate-error" : "eventDate-hint"
                }
                className={`mt-1 w-full rounded-lg border bg-surface px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  errors.eventDate
                    ? "border-destructive ring-1 ring-destructive"
                    : "border-border"
                }`}
              />
              <p id="eventDate-hint" className="mt-1 text-xs text-muted">
                Must be strictly in the future (after today, {today}).
              </p>
              {errors.eventDate && (
                <p
                  id="eventDate-error"
                  role="alert"
                  className="mt-1 text-xs text-destructive"
                >
                  {errors.eventDate}
                </p>
              )}
            </div>

            {/* City */}
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-foreground"
              >
                City / Location <span className="text-accent">*</span>
              </label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => handleFieldChange("city", e.target.value)}
                placeholder="e.g. Jaipur, Bengaluru, Delhi NCR"
                aria-invalid={!!errors.city}
                aria-describedby={errors.city ? "city-error" : undefined}
                className={`mt-1 w-full rounded-lg border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  errors.city
                    ? "border-destructive ring-1 ring-destructive"
                    : "border-border"
                }`}
              />
              {errors.city && (
                <p
                  id="city-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {errors.city}
                </p>
              )}
            </div>

            {/* Guests */}
            <div>
              <label
                htmlFor="guests"
                className="block text-sm font-medium text-foreground"
              >
                Estimated Guests <span className="text-accent">*</span>
              </label>
              <input
                id="guests"
                type="number"
                min={1}
                max={5000}
                value={formData.guests}
                onChange={(e) => handleFieldChange("guests", e.target.value)}
                placeholder="e.g. 250"
                aria-invalid={!!errors.guests}
                aria-describedby={errors.guests ? "guests-error" : undefined}
                className={`mt-1 w-full rounded-lg border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  errors.guests
                    ? "border-destructive ring-1 ring-destructive"
                    : "border-border"
                }`}
              />
              {errors.guests && (
                <p
                  id="guests-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {errors.guests}
                </p>
              )}
            </div>

            {/* Budget */}
            <div>
              <label
                htmlFor="budget"
                className="block text-sm font-medium text-foreground"
              >
                Total Budget (₹ INR) <span className="text-accent">*</span>
              </label>
              <input
                id="budget"
                type="number"
                min={1}
                step={1000}
                value={formData.budget}
                onChange={(e) => handleFieldChange("budget", e.target.value)}
                placeholder="e.g. 500000"
                aria-invalid={!!errors.budget}
                aria-describedby={
                  errors.budget ? "budget-error" : "budget-hint"
                }
                className={`mt-1 w-full rounded-lg border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  errors.budget
                    ? "border-destructive ring-1 ring-destructive"
                    : "border-border"
                }`}
              />
              <p id="budget-hint" className="mt-1 text-xs text-muted">
                {Number(formData.budget) > 0 &&
                  `Approx. ₹${Number(formData.budget).toLocaleString("en-IN")}`}
              </p>
              {errors.budget && (
                <p
                  id="budget-error"
                  role="alert"
                  className="mt-1 text-xs text-destructive"
                >
                  {errors.budget}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleNextFromStep1}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Next: Preferences</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Preferences */}
      {step === 2 && (
        <section aria-labelledby="step2-heading" className="space-y-6">
          <header>
            <h2 id="step2-heading" className="text-2xl font-bold tracking-tight">
              Step 2: Preferences & Details
            </h2>
            <p className="mt-1 text-sm text-muted">
              Add your family traditions, ambiance, and specific requirements.
            </p>
          </header>

          <div className="space-y-5">
            {/* Atmosphere */}
            <div>
              <label
                htmlFor="atmosphere"
                className="block text-sm font-medium text-foreground"
              >
                Desired Atmosphere
              </label>
              <input
                id="atmosphere"
                type="text"
                maxLength={100}
                value={formData.atmosphere}
                onChange={(e) =>
                  handleFieldChange("atmosphere", e.target.value)
                }
                placeholder="e.g. Royal Heritage, Warm & Cozy, Traditional Festive"
                aria-invalid={!!errors.atmosphere}
                aria-describedby={
                  errors.atmosphere ? "atmosphere-error" : "atmosphere-hint"
                }
                className={`mt-1 w-full rounded-lg border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  errors.atmosphere
                    ? "border-destructive ring-1 ring-destructive"
                    : "border-border"
                }`}
              />
              <p id="atmosphere-hint" className="mt-1 text-xs text-muted">
                Up to 100 characters. Informs your 3 tailored celebration themes.
              </p>
              {errors.atmosphere && (
                <p
                  id="atmosphere-error"
                  role="alert"
                  className="mt-1 text-xs text-destructive"
                >
                  {errors.atmosphere}
                </p>
              )}
            </div>

            {/* Must Haves */}
            <div>
              <label
                htmlFor="mustHavesText"
                className="block text-sm font-medium text-foreground"
              >
                Must-Haves (Comma-separated)
              </label>
              <input
                id="mustHavesText"
                type="text"
                value={formData.mustHavesText}
                onChange={(e) =>
                  handleFieldChange("mustHavesText", e.target.value)
                }
                placeholder="e.g. Live Shehnai, Drone Coverage, Photo Booth"
                aria-invalid={!!errors.mustHavesText}
                aria-describedby={
                  errors.mustHavesText
                    ? "mustHavesText-error"
                    : "mustHavesText-hint"
                }
                className={`mt-1 w-full rounded-lg border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  errors.mustHavesText
                    ? "border-destructive ring-1 ring-destructive"
                    : "border-border"
                }`}
              />
              <p id="mustHavesText-hint" className="mt-1 text-xs text-muted">
                Up to 10 priorities separated by commas.
              </p>
              {errors.mustHavesText && (
                <p
                  id="mustHavesText-error"
                  role="alert"
                  className="mt-1 text-xs text-destructive"
                >
                  {errors.mustHavesText}
                </p>
              )}
            </div>

            {/* Dietary Needs */}
            <div>
              <label
                htmlFor="dietary"
                className="block text-sm font-medium text-foreground"
              >
                Dietary & Catering Needs
              </label>
              <input
                id="dietary"
                type="text"
                maxLength={100}
                value={formData.dietary}
                onChange={(e) => handleFieldChange("dietary", e.target.value)}
                placeholder="e.g. Pure vegetarian, separate Jain counter, Halal options"
                aria-invalid={!!errors.dietary}
                aria-describedby={
                  errors.dietary ? "dietary-error" : "dietary-hint"
                }
                className={`mt-1 w-full rounded-lg border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  errors.dietary
                    ? "border-destructive ring-1 ring-destructive"
                    : "border-border"
                }`}
              />
              <p id="dietary-hint" className="mt-1 text-xs text-muted">
                Up to 100 characters. Automatically reflected in caterer notes.
              </p>
              {errors.dietary && (
                <p
                  id="dietary-error"
                  role="alert"
                  className="mt-1 text-xs text-destructive"
                >
                  {errors.dietary}
                </p>
              )}
            </div>

            {/* Accessibility Needs */}
            <div>
              <label
                htmlFor="accessibilityNeeds"
                className="block text-sm font-medium text-foreground"
              >
                Accessibility & Senior Needs
              </label>
              <input
                id="accessibilityNeeds"
                type="text"
                maxLength={150}
                value={formData.accessibilityNeeds}
                onChange={(e) =>
                  handleFieldChange("accessibilityNeeds", e.target.value)
                }
                placeholder="e.g. Step-free wheelchair access, ground-level priority seating for elders"
                aria-invalid={!!errors.accessibilityNeeds}
                aria-describedby={
                  errors.accessibilityNeeds
                    ? "accessibilityNeeds-error"
                    : "accessibilityNeeds-hint"
                }
                className={`mt-1 w-full rounded-lg border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  errors.accessibilityNeeds
                    ? "border-destructive ring-1 ring-destructive"
                    : "border-border"
                }`}
              />
              <p id="accessibilityNeeds-hint" className="mt-1 text-xs text-muted">
                Up to 150 characters. Included in venue and coordinator notes.
              </p>
              {errors.accessibilityNeeds && (
                <p
                  id="accessibilityNeeds-error"
                  role="alert"
                  className="mt-1 text-xs text-destructive"
                >
                  {errors.accessibilityNeeds}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={handleBackToStep1}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleNextFromStep2}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Next: Review</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <section aria-labelledby="step3-heading" className="space-y-6">
          <header>
            <h2 id="step3-heading" className="text-2xl font-bold tracking-tight">
              Step 3: Review Your Celebration
            </h2>
            <p className="mt-1 text-sm text-muted">
              Confirm your event details before generating your tailored plan.
            </p>
          </header>

          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            <div className="p-4 sm:p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Event Overview
              </h3>
              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">Occasion</dt>
                  <dd className="text-sm font-medium capitalize text-foreground">
                    {formData.occasion}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Event Date</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {formData.eventDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">City</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {formData.city}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Guest Count</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {Number(formData.guests).toLocaleString("en-IN")} guests
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Total Budget</dt>
                  <dd className="text-sm font-bold text-accent">
                    ₹{Number(formData.budget).toLocaleString("en-IN")}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="p-4 sm:p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Preferences & Special Needs
              </h3>
              <dl className="mt-3 space-y-3">
                {formData.atmosphere && (
                  <div>
                    <dt className="text-xs text-muted">Atmosphere</dt>
                    <dd className="text-sm text-foreground">
                      {formData.atmosphere}
                    </dd>
                  </div>
                )}
                {formData.mustHavesText && (
                  <div>
                    <dt className="text-xs text-muted">Must-Haves</dt>
                    <dd className="text-sm text-foreground">
                      {formData.mustHavesText}
                    </dd>
                  </div>
                )}
                {formData.dietary && (
                  <div>
                    <dt className="text-xs text-muted">Dietary Requirements</dt>
                    <dd className="text-sm text-foreground">
                      {formData.dietary}
                    </dd>
                  </div>
                )}
                {formData.accessibilityNeeds && (
                  <div>
                    <dt className="text-xs text-muted">
                      Accessibility & Elders
                    </dt>
                    <dd className="text-sm text-foreground">
                      {formData.accessibilityNeeds}
                    </dd>
                  </div>
                )}
                {!formData.atmosphere &&
                  !formData.mustHavesText &&
                  !formData.dietary &&
                  !formData.accessibilityNeeds && (
                    <p className="text-xs italic text-muted">
                      Standard celebration preferences selected.
                    </p>
                  )}
              </dl>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={handleBackToStep2}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleCreatePlan}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Create my plan</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
