import Link from "next/link";
import { LandingCard } from "@/components/landing-card";
import {
  INDIVIDUAL_SLIDER_STEPS,
  INDIVIDUAL_STEP_LABELS,
  PRICING_PLANS,
  SUPPORT_LEVELS,
  SUPPORT_LEVEL_LABELS,
  formatUsdPerMonth,
  getCentsForIndividualStep,
  getCentsForStudioLevel,
  marketingSiteCap,
  type IndividualSliderStep,
  type SupportLevel,
} from "@/lib/pricing-tiers";

type TierRow = {
  label: string;
  price: string;
  detail: string;
  highlight?: boolean;
};

type PlanCardProps = {
  title: string;
  tagline: string;
  tiers: TierRow[];
} & (
  | { comingSoon?: false; ctaLabel: string; ctaHref: string }
  | { comingSoon: true; ctaLabel?: never; ctaHref?: never }
);

function PlanCard(props: PlanCardProps) {
  const { title, tagline, tiers } = props;
  const comingSoon = props.comingSoon === true;

  return (
    <LandingCard variant="default" className="flex flex-col gap-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-lg">
            {title}
          </p>
          {comingSoon && (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5">
              Coming soon
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2 min-h-[calc(2*1.625em)]">
          {tagline}
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800 border-y border-neutral-100 dark:border-neutral-800">
        {tiers.map((tier) => (
          <li
            key={tier.label}
            className="flex items-baseline justify-between gap-4 py-2.5"
          >
            <div className="flex items-baseline gap-2 min-w-0">
              <span
                className={`text-sm ${
                  tier.highlight && !comingSoon
                    ? "font-medium text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {tier.label}
              </span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                {tier.detail}
              </span>
            </div>
            <span className="text-sm tabular-nums text-neutral-900 dark:text-neutral-100 shrink-0">
              {tier.price}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        {comingSoon ? (
          <span
            className="flex w-full items-center justify-center px-4 py-2 text-sm bg-neutral-100 text-neutral-500 border border-neutral-200 rounded-none cursor-not-allowed select-none dark:bg-neutral-900 dark:text-neutral-500 dark:border-neutral-700"
            aria-disabled="true"
          >
            Coming soon
          </span>
        ) : (
          <Link
            href={props.ctaHref}
            className="flex w-full items-center justify-center px-4 py-2 text-sm bg-neutral-900 text-white rounded-none hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors"
          >
            {props.ctaLabel}
          </Link>
        )}
      </div>
    </LandingCard>
  );
}

function individualTierRow(step: IndividualSliderStep): TierRow {
  const cents = getCentsForIndividualStep(step);
  const cap = marketingSiteCap("individual", cents);
  const rebuild = cents <= 0 ? "manual rebuild" : "daily rebuild";
  return {
    label: INDIVIDUAL_STEP_LABELS[step],
    price: formatUsdPerMonth(cents),
    detail: `${cap} sites · ${rebuild}`,
    highlight: step === "free",
  };
}

function studioTierRow(level: SupportLevel): TierRow {
  const cents = getCentsForStudioLevel(level);
  const cap = marketingSiteCap("studio", cents);
  return {
    label: SUPPORT_LEVEL_LABELS[level],
    price: formatUsdPerMonth(cents),
    detail: `${cap} sites · daily rebuild`,
    highlight: level === "medium",
  };
}

export function PayWhatYouCanPricing() {
  const individualTiers = INDIVIDUAL_SLIDER_STEPS.map(individualTierRow);
  const studioTiers = SUPPORT_LEVELS.map(studioTierRow);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <PlanCard
        title={PRICING_PLANS.individual.title}
        tagline={PRICING_PLANS.individual.tagline}
        tiers={individualTiers}
        ctaLabel="Start free"
        ctaHref="/login"
      />
      <PlanCard
        title={PRICING_PLANS.studio.title}
        tagline={PRICING_PLANS.studio.tagline}
        tiers={studioTiers}
        comingSoon
      />
    </div>
  );
}
