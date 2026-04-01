"use client";

import type { CSSProperties, ReactNode } from "react";
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

/**
 * Match native range thumb centers: stops sit at i/(n-1) along the track.
 * Same horizontal inset as typical 16px thumb half-width so first/last line up.
 */
const THUMB_HALF_PX = 8;

const SLIDER_CLASS =
  "w-full h-2 rounded-full appearance-none cursor-pointer bg-neutral-100 accent-neutral-900 m-0 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900 " +
  "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm " +
  "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:bg-neutral-900 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white";

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
              ? "text-neutral-900 font-semibold bg-neutral-100 ring-1 ring-neutral-200"
              : "text-neutral-400" + (disabled ? "" : " hover:text-neutral-600")
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
        on ? "text-neutral-600" : "text-neutral-300 line-through decoration-neutral-200"
      }`}
    >
      <span
        className={`mt-1.5 h-1 w-1 rounded-full shrink-0 ${
          on ? "bg-emerald-500" : "bg-neutral-200"
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
          <>Higher site limits with a paid tier</>
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

function ComingSoonCardShell({
  planLabel,
  children,
}: {
  planLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div
        className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 flex flex-col h-full md:min-h-[36rem] opacity-[0.48] saturate-[0.72] pointer-events-none select-none"
        inert
        aria-label={`${planLabel} — preview only, coming soon`}
      >
        {children}
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-end overflow-hidden rounded-xl p-4 pb-5"
        aria-hidden
      >
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-16deg] whitespace-nowrap text-[clamp(2rem,11vw,3.25rem)] font-semibold uppercase leading-none tracking-tight text-neutral-300/40 select-none"
        >
          Coming soon
        </span>
        <p className="relative z-[1] text-center text-[10px] font-medium uppercase tracking-wider text-neutral-500/90">
          Preview only
        </p>
      </div>
    </div>
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
  const individualCents = getCentsForIndividualStep(PREVIEW_INDIVIDUAL_STEP);
  const studioCents = getCentsForStudioLevel(PREVIEW_STUDIO_LEVEL);
  const individualIdx = indexForIndividualStep(PREVIEW_INDIVIDUAL_STEP);
  const studioIdx = indexForSupportLevel(PREVIEW_STUDIO_LEVEL);

  return (
    <div className="space-y-10 sm:space-y-12">
      <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-sm font-medium text-neutral-900">Free for testing</p>
        <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed max-w-xl">
          Everything in tiny.garden is <span className="font-medium text-neutral-800">free to use</span>{" "}
          while we ship and learn. No card required — log in with Are.na and publish. The paid tiers
          below are a <span className="font-medium text-neutral-800">preview</span> of where
          pricing is headed; they&apos;re not available yet.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 md:items-stretch">
        <ComingSoonCardShell planLabel={PRICING_PLANS.individual.title}>
          {(() => {
            const def = PRICING_PLANS.individual;
            const sliderLabelId = "pwyc-slider-individual";
            return (
              <>
                <div className="flex items-start justify-between gap-4 sm:gap-5">
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">{def.title}</p>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{def.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl sm:text-2xl font-medium tabular-nums leading-none text-neutral-900">
                      {formatUsdPerMonth(individualCents)}
                    </p>
                  </div>
                </div>
                <ul className="mt-4 min-h-[4.75rem] space-y-2 text-[11px] text-neutral-500 leading-relaxed">
                  {def.highlights.map((h) => (
                    <li key={h}>· {h}</li>
                  ))}
                </ul>
                <div className="mt-5">
                  <label
                    id={sliderLabelId}
                    className="text-[10px] text-neutral-400 uppercase tracking-wider block mb-3"
                  >
                    Monthly amount
                  </label>
                  <AlignedSliderWithTicks
                    min={0}
                    max={3}
                    value={individualIdx}
                    onChange={noopSliderChange}
                    labels={INDIVIDUAL_SLIDER_STEPS.map((step) => {
                      const cents = def.presets[step];
                      return cents === 0 ? "$0" : `$${cents / 100}`;
                    })}
                    activeIndex={individualIdx}
                    onPick={noopSliderPick}
                    ariaLabelledBy={sliderLabelId}
                    ariaValueText={formatUsdPerMonth(individualCents)}
                    disabled
                  />
                </div>
                <div className="mt-6 flex flex-1 flex-col min-h-0 border-t border-neutral-200 pt-6">
                  <PricingFeaturesList plan="individual" amountCents={individualCents} />
                  <div className="flex-1 min-h-4" aria-hidden />
                </div>
                <div className="pt-6 border-t border-neutral-200">
                  <span className="block w-full text-center text-sm py-2.5 px-3 rounded-md font-medium border border-neutral-200 bg-neutral-100 text-neutral-400">
                    {individualCents > 0
                      ? `Continue to payment · ${formatUsdPerMonth(individualCents)}`
                      : "Continue free — log in"}
                  </span>
                </div>
              </>
            );
          })()}
        </ComingSoonCardShell>

        <ComingSoonCardShell planLabel={PRICING_PLANS.studio.title}>
          {(() => {
            const def = PRICING_PLANS.studio;
            const sliderLabelId = "pwyc-slider-studio";
            return (
              <>
                <div className="flex items-start justify-between gap-4 sm:gap-5">
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">{def.title}</p>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{def.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl sm:text-2xl font-medium tabular-nums leading-none text-neutral-900">
                      {formatUsdPerMonth(studioCents)}
                    </p>
                  </div>
                </div>
                <ul className="mt-4 min-h-[4.75rem] space-y-2 text-[11px] text-neutral-500 leading-relaxed">
                  {def.highlights.map((h) => (
                    <li key={h}>· {h}</li>
                  ))}
                </ul>
                <div className="mt-5">
                  <label
                    id={sliderLabelId}
                    className="text-[10px] text-neutral-400 uppercase tracking-wider block mb-3"
                  >
                    Monthly amount
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
                <div className="mt-6 flex flex-1 flex-col min-h-0 border-t border-neutral-200 pt-6">
                  <PricingFeaturesList plan="studio" amountCents={studioCents} />
                  <div className="flex-1 min-h-4" aria-hidden />
                </div>
                <div className="pt-6 border-t border-neutral-200">
                  <span className="block w-full text-center text-sm py-2.5 px-3 rounded-md font-medium border border-neutral-200 bg-neutral-100 text-neutral-400">
                    Continue to payment · {formatUsdPerMonth(studioCents)}
                  </span>
                </div>
              </>
            );
          })()}
        </ComingSoonCardShell>
      </div>

      <div className="border border-dashed border-neutral-200 rounded-lg p-6 sm:p-8 bg-neutral-50/30">
        <p className="text-sm font-medium text-neutral-900">Beta access</p>
        <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
          We&apos;re still welcoming the first {betaSpots} accounts at no cost while we ship. After
          that, new signups may wait for a spot or choose a paid tier once checkout goes live.
        </p>
        <div className="flex items-center justify-between gap-4 mt-6 mb-6">
          <p className="text-sm font-medium text-neutral-700">
            {spotsRemaining > 0
              ? `${spotsRemaining} of ${betaSpots} free spots left`
              : "All free spots claimed"}
          </p>
          {spotsRemaining > 0 && (
            <div className="flex-1 max-w-[120px] h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-neutral-900 rounded-full transition-all"
                style={{
                  width: `${((betaSpots - spotsRemaining) / betaSpots) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
        {betaFull ? (
          <div className="space-y-4">
            <p className="text-xs text-neutral-500 leading-relaxed">
              Free spots are full for now. Join the waitlist and we&apos;ll email you when there&apos;s
              room — paid checkout will open here when those plans launch.
            </p>
            <ButtondownWaitlistForm idPrefix="pwyc-waitlist" />
          </div>
        ) : (
          <BetaCtaLink
            hrefWhenOpen="/login"
            className="inline-block px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
          >
            Start at $0
          </BetaCtaLink>
        )}
      </div>
    </div>
  );
}
