/**
 * Pricing: Individual (includes Free $0 + Low/Med/High) vs Studio (paid tiers only).
 * Marketing features: daily auto-rebuild requires payment; site cap text scales with selection.
 */

export const PWYC_MAX_CENTS = 5000;
export const PWYC_MIN_PAID_CENTS = 100;

export type PricingPlanId = "individual" | "studio";

export type SupportLevel = "low" | "medium" | "high";

/** Individual slider includes a true $0 tier; Studio is Low / Med / High only. */
export type IndividualSliderStep = "free" | SupportLevel;

export const SUPPORT_LEVELS: SupportLevel[] = ["low", "medium", "high"];

export const INDIVIDUAL_SLIDER_STEPS: IndividualSliderStep[] = [
  "free",
  "low",
  "medium",
  "high",
];

export const INDIVIDUAL_STEP_LABELS: Record<IndividualSliderStep, string> = {
  free: "Free",
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const SUPPORT_LEVEL_LABELS: Record<SupportLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const PRICING_PLANS = {
  individual: {
    id: "individual" as const,
    title: "Individual",
    tagline: "Personal sites and portfolios — a free base, with optional support if you want more.",
    presets: {
      free: 0,
      low: 300,
      medium: 800,
      high: 1500,
    } satisfies Record<IndividualSliderStep, number>,
    highlights: [
      "$0 for essentials — only pay if you want daily rebuilds and higher limits",
    ],
  },
  studio: {
    id: "studio" as const,
    title: "Small studio",
    tagline: "Teams, client work, or several sites at once.",
    presets: {
      low: 1500,
      medium: 2800,
      high: 5000,
    } satisfies Record<SupportLevel, number>,
    highlights: [
      "Built for collectives, freelancers, and small studios",
      "Higher caps for multiple sites by default",
    ],
  },
} as const;

export type PwycSelectionV4 = {
  v: 4;
  plan: PricingPlanId;
  individualStep: IndividualSliderStep;
  studioLevel: SupportLevel;
};

/** @deprecated use v4 */
export type PwycSelectionV3 = {
  v: 3;
  plan: PricingPlanId;
  individualLevel: SupportLevel;
  studioLevel: SupportLevel;
};

export type PwycSelectionV2 = {
  v: 2;
  plan: PricingPlanId;
  level: SupportLevel;
};

export const PWYC_SELECTION_KEY = "tinygarden.pwycSelection";

export const PWYC_AMOUNT_STORAGE_KEY = "tinygarden.pwycAmountCents";
export const PWYC_LEGACY_TIER_STORAGE_KEY = "tinygarden.pwycTierId";

export const PWYC_DEFAULT_PLAN: PricingPlanId = "individual";
export const PWYC_DEFAULT_INDIVIDUAL_STEP: IndividualSliderStep = "free";
export const PWYC_DEFAULT_STUDIO_LEVEL: SupportLevel = "medium";

export function getCentsForIndividualStep(step: IndividualSliderStep): number {
  return PRICING_PLANS.individual.presets[step];
}

export function getCentsForStudioLevel(level: SupportLevel): number {
  return PRICING_PLANS.studio.presets[level];
}

export function getCentsForSelection(
  plan: PricingPlanId,
  individualStep: IndividualSliderStep,
  studioLevel: SupportLevel
): number {
  if (plan === "individual") {
    return getCentsForIndividualStep(individualStep);
  }
  return getCentsForStudioLevel(studioLevel);
}

const _allowed = new Set<number>();
for (const c of Object.values(PRICING_PLANS.studio.presets)) {
  _allowed.add(c);
}
for (const step of SUPPORT_LEVELS) {
  _allowed.add(PRICING_PLANS.individual.presets[step]);
}

export const PWYC_ALLOWED_SUBSCRIPTION_CENTS = _allowed;

export function isAllowedSubscriptionAmount(cents: number): boolean {
  return PWYC_ALLOWED_SUBSCRIPTION_CENTS.has(cents);
}

export function nearestAllowedAmountCents(cents: number): number {
  const sorted = [...PWYC_ALLOWED_SUBSCRIPTION_CENTS].sort((a, b) => a - b);
  return sorted.reduce((best, cur) =>
    Math.abs(cur - cents) < Math.abs(best - cents) ? cur : best
  );
}

export function normalizePaidAmountCents(cents: number): number {
  if (cents < PWYC_MIN_PAID_CENTS) {
    return getCentsForIndividualStep("medium");
  }
  if (isAllowedSubscriptionAmount(cents)) return cents;
  return nearestAllowedAmountCents(cents);
}

export const PWYC_DEFAULT_AMOUNT_CENTS = getCentsForIndividualStep("medium");

export function findSelectionForAmountCents(cents: number): {
  plan: PricingPlanId;
  individualStep: IndividualSliderStep;
  studioLevel: SupportLevel;
} {
  if (cents <= 0) {
    return {
      plan: "individual",
      individualStep: "free",
      studioLevel: PWYC_DEFAULT_STUDIO_LEVEL,
    };
  }
  for (const step of [...INDIVIDUAL_SLIDER_STEPS].reverse()) {
    if (step === "free") continue;
    if (PRICING_PLANS.individual.presets[step] === cents) {
      return {
        plan: "individual",
        individualStep: step,
        studioLevel: PWYC_DEFAULT_STUDIO_LEVEL,
      };
    }
  }
  for (const level of SUPPORT_LEVELS) {
    if (PRICING_PLANS.studio.presets[level] === cents) {
      return {
        plan: "studio",
        individualStep: PWYC_DEFAULT_INDIVIDUAL_STEP,
        studioLevel: level,
      };
    }
  }
  const n = normalizePaidAmountCents(cents);
  return findSelectionForAmountCents(n);
}

export function indexForIndividualStep(step: IndividualSliderStep): number {
  return INDIVIDUAL_SLIDER_STEPS.indexOf(step);
}

export function individualStepFromIndex(i: number): IndividualSliderStep {
  const clamped = Math.max(0, Math.min(3, Math.round(Number(i))));
  return INDIVIDUAL_SLIDER_STEPS[clamped]!;
}

export function indexForSupportLevel(level: SupportLevel): number {
  const idx = SUPPORT_LEVELS.indexOf(level);
  return idx >= 0 ? idx : 1;
}

export function supportLevelFromIndex(i: number): SupportLevel {
  const clamped = Math.max(0, Math.min(2, Math.round(Number(i))));
  return SUPPORT_LEVELS[clamped]!;
}

export function isPricingPlanId(s: string): s is PricingPlanId {
  return s === "individual" || s === "studio";
}

export function isSupportLevel(s: string): s is SupportLevel {
  return s === "low" || s === "medium" || s === "high";
}

export function isIndividualSliderStep(s: string): s is IndividualSliderStep {
  return (
    s === "free" ||
    s === "low" ||
    s === "medium" ||
    s === "high"
  );
}

/** Marketing copy: site cap shown on pricing (not yet enforced per-tier in API). */
export function marketingSiteCap(
  plan: PricingPlanId,
  cents: number
): number {
  if (plan === "individual") {
    if (cents <= 0) return 3;
    if (cents <= 300) return 5;
    if (cents <= 800) return 10;
    return 20;
  }
  if (cents <= 1500) return 12;
  if (cents <= 2800) return 30;
  return 50;
}

export function formatUsdPerMonth(cents: number): string {
  if (cents <= 0) return "$0";
  const d = cents / 100;
  return d % 1 === 0 ? `$${d.toFixed(0)}/mo` : `$${d.toFixed(2)}/mo`;
}

const LEGACY_TIER_CENTS: Record<string, number> = {
  friend: 300,
  supporter: 500,
  patron: 700,
  champion: 2500,
};

export function legacyTierIdToAmountCents(tierId: string): number | undefined {
  return LEGACY_TIER_CENTS[tierId];
}

export function clampPwycAmountCents(cents: number): number {
  return Math.min(PWYC_MAX_CENTS, Math.max(0, Math.round(cents)));
}

/** Checkout / analytics band from monthly cents. */
export function featureBandIndexForCents(cents: number): 0 | 1 | 2 {
  if (cents <= 500) return 0;
  if (cents < 2500) return 1;
  return 2;
}
