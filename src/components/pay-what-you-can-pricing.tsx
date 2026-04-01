"use client";

import type { CSSProperties, ReactNode } from "react";
import { BETA_SPOTS } from "@/lib/beta";
import {
  INDIVIDUAL_SLIDER_STEPS,
  PRICING_PLANS,
  SUPPORT_LEVELS,
  type IndividualSliderStep,
  type PricingPlanId,
  type SupportLevel,
  formatUsdPerMonth,
  getCentsForIndividualStep,
  getCentsForStudioLevel,
  indexForIndividualStep,
  indexForSupportLevel,
  marketingSiteCap,
} from "@/lib/pricing-tiers";
import { BetaCtaLink } from "@/components/beta-landing-shell";
import { ButtondownWaitlistForm } from "@/components/buttondown-waitlist-form";
import { LandingCard } from "@/components/landing-card";

/**
 * Match native range thumb centers: stops sit at i/(n-1) along the track.
 * Same horizontal inset as typical 16px thumb half-width so first/last line up.
 */
const THUMB_HALF_PX = 8;

const SLIDER_CLASS =
  "w-full h-2 rounded-full appearance-none cursor-pointer bg-neutral-100 dark:bg-neutral-800 accent-neutral-900 dark:accent-neutral-100 m-0 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900 dark:[&::-webkit-slider-thumb]:bg-neutral-100 " +
  "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white dark:[&::-webkit-slider-thumb]:border-neutral-950 [&::-webkit-slider-thumb]:shadow-sm " +
  "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:bg-neutral-900 dark:[&::-moz-range-thumb]:bg-neutral-100 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white dark:[&::-moz-range-thumb]:border-neutral-950";

const SLIDER_DISABLED_CLASS =
  " opacity-60 cursor-not-allowed [&::-webkit-slider-thumb]:cursor-not-allowed [&::-moz-range-thumb]:cursor-not-allowed";

function tickStyle(index: number, count: number): CSSProperties {
  if (count <= 1) {
    return { left: "0%", transform: "translateX(0)" };
  }
  const pct = (index / (count - 1)) * 100;
  if (index === 0) {
    return { left: "0%", transform: "translateX(0)" };
  }
  if (index === count - 1) {
    return { left: "100%", transform: "translateX(-100%)" };
  }
  return { left: `${pct}%`, transform: "translateX(-50%)" };
}

function AlignedSliderWithTicks({
  min,
  max,
  value,
  onChange,
  labels,
  activeIndex,
  onPick,
  ariaLabelledBy,
  ariaValueText,
  disabled,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
  labels: string[];
  activeIndex: number;
  onPick: (index: number) => void;
  ariaLabelledBy: string;
  ariaValueText: string;
  disabled?: boolean;
}) {
  return (
    <div
      className="w-full"
      style={{
        paddingLeft: THUMB_HALF_PX,
        paddingRight: THUMB_HALF_PX,
      }}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        aria-labelledby={ariaLabelledBy}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={ariaValueText}
        className={SLIDER_CLASS + (disabled ? SLIDER_DISABLED_CLASS : "")}
      />
      <div className="relative w-full h-8 mt-2.5" aria-hidden>
        {labels.map((label, i) => {
          const on = activeIndex === i;
          const style = tickStyle(i, labels.length);
          const cls = `absolute top-0 tabular-nums text-[11px] sm:text-xs py-1 px-1.5 rounded-md ${
            on
              ? "text-neutral-900 dark:text-neutral-100 font-semibold bg-neutral-100 dark:bg-neutral-800 ring-1 ring-neutral-200 dark:ring-neutral-600"
              : "text-neutral-400 dark:text-neutral-500" +
                (disabled ? "" : " hover:text-neutral-600 dark:hover:text-neutral-300")
          }`;
          if (disabled) {
            return (
              <span key={i} style={style} className={cls}>
                {label}
              </span>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              style={style}
              className={`${cls} transition-colors`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FeatureRow({
  on,
  children,
}: {
  on: boolean;
  children: ReactNode;
}) {
  return (
    <li
      className={`text-[11px] sm:text-xs flex items-start gap-3 py-0.5 transition-colors duration-200 ${
        on
          ? "text-neutral-600 dark:text-neutral-400"
          : "text-neutral-300 dark:text-neutral-600 line-through decoration-neutral-200 dark:decoration-neutral-600"
      }`}
    >
      <span
        className={`mt-1.5 h-1 w-1 rounded-full shrink-0 ${
          on ? "bg-emerald-500" : "bg-neutral-200 dark:bg-neutral-600"
        }`}
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}

/** Base perks first; payment-gated rows at bottom (crossed out until paid on Individual). */
function PricingFeaturesList({
  plan,
  amountCents,
}: {
  plan: PricingPlanId;
  amountCents: number;
}) {
  const paid = amountCents > 0;
  const cap = marketingSiteCap(plan, amountCents);
  const gatedOn = plan === "studio" || paid;
  const individualFree = plan === "individual" && !paid;

  return (
    <ul
      key={`${plan}-${amountCents}`}
      className="space-y-3 sm:space-y-3.5"
      aria-live="polite"
    >
      <FeatureRow on>All templates</FeatureRow>
      {individualFree ? (
        <FeatureRow on={false}>Daily automatic rebuild</FeatureRow>
      ) : (
        <>
          <FeatureRow on>Manual rebuild anytime</FeatureRow>
          <FeatureRow on={gatedOn}>Daily automatic rebuild</FeatureRow>
        </>
      )}
      <FeatureRow on={gatedOn}>
        {gatedOn ? (
          <>
            Up to <span className="tabular-nums font-medium">{cap}</span> sites
          </>
        ) : (
          <>More sites when you add paid support</>
        )}
      </FeatureRow>
    </ul>
  );
}

/** Static preview values on disabled cards (not persisted). */
const PREVIEW_INDIVIDUAL_STEP: IndividualSliderStep = "free";
const PREVIEW_STUDIO_LEVEL: SupportLevel = "medium";

function noopSliderChange(_n: number) {
  /* sliders are disabled */
}

function noopSliderPick(_i: number) {
  /* tick labels non-interactive when disabled */
}

function ComingSoonOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-end overflow-hidden p-4 pb-5"
      aria-hidden
    >
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-16deg] whitespace-nowrap text-[clamp(2rem,11vw,3.25rem)] font-semibold uppercase leading-none tracking-tight text-neutral-300/40 dark:text-neutral-600/30 select-none"
      >
        Coming soon
      </span>
      <p className="relative z-[1] text-center text-[10px] font-medium uppercase tracking-wider text-neutral-500/90 dark:text-neutral-400/90">
        Preview only
      </p>
    </div>
  );
}

function ComingSoonPricingCard({
  planLabel,
  children,
}: {
  planLabel: string;
  children: ReactNode;
}) {
  return (
    <div
      className="relative"
      role="group"
      aria-label={`${planLabel} — preview only, coming soon`}
    >
      <LandingCard
        inert
        className="flex flex-col h-full md:min-h-[36rem] opacity-[0.48] saturate-[0.72] pointer-events-none select-none"
        variant="default"
      >
        {children}
      </LandingCard>
      <ComingSoonOverlay />
    </div>
  );
}

function BetaAccessCard({
  spotsRemaining,
  betaFull,
  betaSpots,
}: {
  spotsRemaining: number;
  betaFull: boolean;
  betaSpots: number;
}) {
  let cap = Number(betaSpots);
  let rem = Number(spotsRemaining);
  if (!Number.isFinite(cap) || cap < 1) cap = BETA_SPOTS;
  if (!Number.isFinite(rem) || rem < 0) rem = cap;
  rem = Math.min(cap, rem);
  const used = cap - rem;
  const pctFilled = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;

  return (
    <LandingCard variant="accent">
      {betaFull ? (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-900/80 dark:text-emerald-300/90">
            Rolling invites
          </p>
          <p className="mt-2 text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-lg">
            All {cap} beta spots are full — we&apos;re letting more people in every day.
          </p>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl">
            Over the next week we&apos;ll keep pulling from the waitlist. Leave your email and
            we&apos;ll ping you as soon as there&apos;s a spot with your name on it.
          </p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 max-w-xl">
            When you&apos;re in, the free tier stays: publish from your channel at $0. Paid options
            are only for people who want more automation or capacity.
          </p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 max-w-xl">
            One list, one heads-up when you&apos;re up. No newsletter spam.
          </p>
          <div className="mt-5 max-w-md">
            <ButtondownWaitlistForm
              idPrefix="pricing-open-beta"
              successMessage="You’re on the list — we’ll email you as we open more spots this week."
            />
          </div>
        </>
      ) : (
        <>
          <p className="text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-lg">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-900/80 dark:text-emerald-300/90">
              Beta access
            </span>
            {" — "}
            We&apos;re opening {cap} spots this week. A few more people get in every day.
          </p>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl">
            Log in with Are.na to claim a spot. No credit card — pick a channel, pick a template, go
            live.
          </p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 max-w-xl">
            The base stays free: one site from your channel at $0. If we add paid tiers later,
            they&apos;ll be for power users who want more — not a paywall on publishing.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 tabular-nums shrink-0">
              {used} of {cap} spots claimed
            </p>
            <div
              className="h-1.5 flex-1 max-w-full sm:max-w-[200px] bg-neutral-100 dark:bg-neutral-800 overflow-hidden"
              role="progressbar"
              aria-valuenow={used}
              aria-valuemin={0}
              aria-valuemax={cap}
              aria-label={`Beta spots claimed: ${used} of ${cap}`}
            >
              <div
                className="h-full bg-neutral-900 dark:bg-neutral-100 transition-[width] duration-300"
                style={{ width: `${pctFilled}%` }}
              />
            </div>
          </div>
          <div className="mt-6">
            <BetaCtaLink
              hrefWhenOpen="/login"
              className="inline-block px-4 py-2 text-sm bg-neutral-900 text-white rounded-none hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors"
            >
              Start free
            </BetaCtaLink>
            <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400 max-w-md leading-relaxed">
              Free to publish. You&apos;ll only see payment if you choose a paid option later.
            </p>
          </div>
        </>
      )}
    </LandingCard>
  );
}

function PricingTierPreview({ plan }: { plan: PricingPlanId }) {
  const def = PRICING_PLANS[plan];
  const sliderLabelId =
    plan === "individual" ? "pwyc-slider-individual" : "pwyc-slider-studio";

  if (plan === "individual") {
    const individualCents = getCentsForIndividualStep(PREVIEW_INDIVIDUAL_STEP);
    const individualIdx = indexForIndividualStep(PREVIEW_INDIVIDUAL_STEP);
    return (
      <ComingSoonPricingCard planLabel={def.title}>
        <div className="flex items-start justify-between gap-4 sm:gap-5">
          <div className="text-left min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{def.title}</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 leading-relaxed">{def.tagline}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl sm:text-2xl font-medium tabular-nums leading-none text-neutral-900 dark:text-neutral-100">
              {formatUsdPerMonth(individualCents)}
            </p>
          </div>
        </div>
        <ul className="mt-4 min-h-[4.75rem] space-y-2 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {def.highlights.map((h) => (
            <li key={h}>· {h}</li>
          ))}
        </ul>
        <div className="mt-5">
          <label
            id={sliderLabelId}
            className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-3"
          >
            Support (monthly)
          </label>
          <AlignedSliderWithTicks
            min={0}
            max={3}
            value={individualIdx}
            onChange={noopSliderChange}
            labels={INDIVIDUAL_SLIDER_STEPS.map((step) => {
              const cents = getCentsForIndividualStep(step);
              return cents === 0 ? "$0" : `$${cents / 100}`;
            })}
            activeIndex={individualIdx}
            onPick={noopSliderPick}
            ariaLabelledBy={sliderLabelId}
            ariaValueText={formatUsdPerMonth(individualCents)}
            disabled
          />
        </div>
        <div className="mt-6 flex flex-1 flex-col min-h-0 border-t border-neutral-200 dark:border-neutral-700 pt-6">
          <PricingFeaturesList plan="individual" amountCents={individualCents} />
          <div className="flex-1 min-h-4" aria-hidden />
        </div>
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-700">
          <span className="block w-full text-center text-sm py-2.5 px-3 rounded-none font-medium border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500">
            {individualCents > 0
              ? `Checkout opens later · ${formatUsdPerMonth(individualCents)}`
              : "Start free — log in"}
          </span>
        </div>
      </ComingSoonPricingCard>
    );
  }

  const studioCents = getCentsForStudioLevel(PREVIEW_STUDIO_LEVEL);
  const studioIdx = indexForSupportLevel(PREVIEW_STUDIO_LEVEL);
  return (
    <ComingSoonPricingCard planLabel={def.title}>
      <div className="flex items-start justify-between gap-4 sm:gap-5">
        <div className="text-left min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{def.title}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 leading-relaxed">{def.tagline}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl sm:text-2xl font-medium tabular-nums leading-none text-neutral-900 dark:text-neutral-100">
            {formatUsdPerMonth(studioCents)}
          </p>
        </div>
      </div>
      <ul className="mt-4 min-h-[4.75rem] space-y-2 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
        {def.highlights.map((h) => (
          <li key={h}>· {h}</li>
        ))}
      </ul>
      <div className="mt-5">
        <label
          id={sliderLabelId}
            className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-3"
          >
            Support (monthly)
          </label>
          <AlignedSliderWithTicks
            min={0}
            max={2}
          value={studioIdx}
          onChange={noopSliderChange}
          labels={SUPPORT_LEVELS.map((lv) => `$${def.presets[lv] / 100}`)}
          activeIndex={studioIdx}
          onPick={noopSliderPick}
          ariaLabelledBy={sliderLabelId}
          ariaValueText={formatUsdPerMonth(studioCents)}
          disabled
        />
      </div>
      <div className="mt-6 flex flex-1 flex-col min-h-0 border-t border-neutral-200 dark:border-neutral-700 pt-6">
        <PricingFeaturesList plan="studio" amountCents={studioCents} />
        <div className="flex-1 min-h-4" aria-hidden />
      </div>
      <div className="pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <span className="block w-full text-center text-sm py-2.5 px-3 rounded-none font-medium border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500">
          Checkout opens later · {formatUsdPerMonth(studioCents)}
        </span>
      </div>
    </ComingSoonPricingCard>
  );
}

type Props = {
  spotsRemaining: number;
  betaFull: boolean;
  betaSpots: number;
};

export function PayWhatYouCanPricing({
  spotsRemaining,
  betaFull,
  betaSpots,
}: Props) {
  return (
    <div className="space-y-10 sm:space-y-12">
      <BetaAccessCard
        spotsRemaining={spotsRemaining}
        betaFull={betaFull}
        betaSpots={betaSpots}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 md:items-stretch">
        <PricingTierPreview plan="individual" />
        <PricingTierPreview plan="studio" />
      </div>
    </div>
  );
}
