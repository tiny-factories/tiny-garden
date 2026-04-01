"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  INDIVIDUAL_SLIDER_STEPS,
  PRICING_PLANS,
  PWYC_SELECTION_KEY,
  SUPPORT_LEVELS,
  type IndividualSliderStep,
  type PricingPlanId,
  type PwycSelectionV4,
  type SupportLevel,
  formatUsdPerMonth,
  getCentsForSelection,
  getCentsForIndividualStep,
  getCentsForStudioLevel,
  individualStepFromIndex,
  indexForIndividualStep,
  indexForSupportLevel,
  marketingSiteCap,
  supportLevelFromIndex,
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
        aria-labelledby={ariaLabelledBy}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={ariaValueText}
        className={SLIDER_CLASS}
      />
      <div className="relative w-full h-7 mt-2" aria-hidden>
        {labels.map((label, i) => {
          const on = activeIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              style={tickStyle(i, labels.length)}
              className={`absolute top-0 tabular-nums text-[11px] sm:text-xs py-0.5 px-1 rounded-sm transition-colors whitespace-nowrap ${
                on
                  ? "text-neutral-900 font-semibold ring-1 ring-neutral-900/15 bg-neutral-100/80"
                  : "text-neutral-400 hover:text-neutral-600"
              }`}
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
    <div className="pt-6 border-t border-neutral-100/80">
      <ul
        key={`${plan}-${amountCents}`}
        className="space-y-3.5 sm:space-y-4"
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
  const [plan, setPlan] = useState<PricingPlanId>("individual");
  const [individualStep, setIndividualStep] =
    useState<IndividualSliderStep>("free");
  const [studioLevel, setStudioLevel] = useState<SupportLevel>("medium");

  const persistIndividualAndGo = useCallback(() => {
    try {
      const payload: PwycSelectionV4 = {
        v: 4,
        plan: "individual",
        individualStep,
        studioLevel,
      };
      localStorage.setItem(PWYC_SELECTION_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [individualStep, studioLevel]);

  const persistStudioAndGo = useCallback(() => {
    try {
      const payload: PwycSelectionV4 = {
        v: 4,
        plan: "studio",
        individualStep,
        studioLevel,
      };
      localStorage.setItem(PWYC_SELECTION_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [individualStep, studioLevel]);

  const activeCents = getCentsForSelection(plan, individualStep, studioLevel);

  const selectionSummary = useMemo(() => {
    const def = PRICING_PLANS[plan];
    if (plan === "individual") {
      return `${def.title} · ${formatUsdPerMonth(getCentsForIndividualStep(individualStep))}`;
    }
    return `${def.title} · ${formatUsdPerMonth(getCentsForStudioLevel(studioLevel))}`;
  }, [plan, individualStep, studioLevel]);

  const isPaidSelection = activeCents > 0;

  return (
    <div className="space-y-12 sm:space-y-14">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 md:items-stretch">
        {/* Individual */}
        {(() => {
          const pid = "individual" as const;
          const def = PRICING_PLANS.individual;
          const selected = plan === pid;
          const cardCents = getCentsForIndividualStep(individualStep);
          const sliderIdx = indexForIndividualStep(individualStep);
          const sliderLabelId = "pwyc-slider-individual";
          const paid = cardCents > 0;

          return (
            <div
              className={`rounded-lg border p-5 sm:p-6 transition-colors flex flex-col h-full md:min-h-[36rem] ${
                selected
                  ? "border-neutral-900 bg-neutral-50/40"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4 sm:gap-5">
                <button
                  type="button"
                  onClick={() => setPlan(pid)}
                  className="text-left min-w-0 flex-1"
                >
                  <p className="text-sm font-medium text-neutral-900">{def.title}</p>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    {def.tagline}
                  </p>
                </button>
                <div className="text-right shrink-0">
                  <p
                    className={`text-xl sm:text-2xl font-medium tabular-nums leading-none ${
                      selected ? "text-neutral-900" : "text-neutral-700"
                    }`}
                  >
                    {formatUsdPerMonth(cardCents)}
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-[11px] text-neutral-500 leading-relaxed">
                {def.highlights.map((h) => (
                  <li key={h}>· {h}</li>
                ))}
              </ul>

              <div className="mt-6">
                <label
                  id={sliderLabelId}
                  className="text-[10px] text-neutral-400 uppercase tracking-wider block mb-3"
                >
                  Monthly amount
                </label>
                <AlignedSliderWithTicks
                  min={0}
                  max={3}
                  value={sliderIdx}
                  onChange={(n) => {
                    setIndividualStep(individualStepFromIndex(n));
                    setPlan(pid);
                  }}
                  labels={INDIVIDUAL_SLIDER_STEPS.map((step) => {
                    const cents = def.presets[step];
                    return cents === 0 ? "$0" : `$${cents / 100}`;
                  })}
                  activeIndex={sliderIdx}
                  onPick={(i) => {
                    setIndividualStep(individualStepFromIndex(i));
                    setPlan(pid);
                  }}
                  ariaLabelledBy={sliderLabelId}
                  ariaValueText={formatUsdPerMonth(cardCents)}
                />
              </div>

              <div className="flex-1 min-h-0 mt-7 flex flex-col justify-end">
                <PricingFeaturesList plan={pid} amountCents={cardCents} />
              </div>

              <div className="mt-auto pt-6 border-t border-neutral-200">
                <Link
                  href="/login"
                  onClick={persistIndividualAndGo}
                  className={`block w-full text-center text-sm py-2.5 px-3 rounded-md font-medium transition-colors ${
                    paid
                      ? "bg-neutral-900 text-white hover:bg-neutral-800"
                      : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                  }`}
                >
                  {paid
                    ? `Continue to payment · ${formatUsdPerMonth(cardCents)}`
                    : "Continue free — log in"}
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Studio */}
        {(() => {
          const pid = "studio" as const;
          const def = PRICING_PLANS.studio;
          const selected = plan === pid;
          const cardCents = getCentsForStudioLevel(studioLevel);
          const sliderIdx = indexForSupportLevel(studioLevel);
          const sliderLabelId = "pwyc-slider-studio";

          return (
            <div
              className={`rounded-lg border p-5 sm:p-6 transition-colors flex flex-col h-full md:min-h-[36rem] ${
                selected
                  ? "border-neutral-900 bg-neutral-50/40"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4 sm:gap-5">
                <button
                  type="button"
                  onClick={() => setPlan(pid)}
                  className="text-left min-w-0 flex-1"
                >
                  <p className="text-sm font-medium text-neutral-900">{def.title}</p>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    {def.tagline}
                  </p>
                </button>
                <div className="text-right shrink-0">
                  <p
                    className={`text-xl sm:text-2xl font-medium tabular-nums leading-none ${
                      selected ? "text-neutral-900" : "text-neutral-700"
                    }`}
                  >
                    {formatUsdPerMonth(cardCents)}
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-[11px] text-neutral-500 leading-relaxed">
                {def.highlights.map((h) => (
                  <li key={h}>· {h}</li>
                ))}
              </ul>

              <div className="mt-6">
                <label
                  id={sliderLabelId}
                  className="text-[10px] text-neutral-400 uppercase tracking-wider block mb-3"
                >
                  Monthly amount
                </label>
                <AlignedSliderWithTicks
                  min={0}
                  max={2}
                  value={sliderIdx}
                  onChange={(n) => {
                    setStudioLevel(supportLevelFromIndex(n));
                    setPlan(pid);
                  }}
                  labels={SUPPORT_LEVELS.map(
                    (lv) => `$${def.presets[lv] / 100}`
                  )}
                  activeIndex={sliderIdx}
                  onPick={(i) => {
                    setStudioLevel(supportLevelFromIndex(i));
                    setPlan(pid);
                  }}
                  ariaLabelledBy={sliderLabelId}
                  ariaValueText={formatUsdPerMonth(cardCents)}
                />
              </div>

              <div className="flex-1 min-h-0 mt-7 flex flex-col justify-end">
                <PricingFeaturesList plan={pid} amountCents={cardCents} />
              </div>

              <div className="mt-auto pt-6 border-t border-neutral-200">
                <Link
                  href="/login"
                  onClick={persistStudioAndGo}
                  className="block w-full text-center text-sm py-2.5 px-3 rounded-md font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                >
                  Continue to payment · {formatUsdPerMonth(cardCents)}
                </Link>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="border border-dashed border-neutral-200 rounded-lg p-6 sm:p-8 bg-neutral-50/30">
        <p className="text-sm font-medium text-neutral-900">Free during beta</p>
        <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
          We&apos;re still welcoming the first {betaSpots} accounts at $0 while we ship.
          Individual&apos;s first slider stop is that same idea — no card required.
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
              Free spots are full. Choose Studio or a paid Individual tier, or join the
              waitlist.
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

      <div className="rounded-lg border border-neutral-200 p-5 sm:p-7 bg-white">
        {betaFull && isPaidSelection && (
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-2 py-1.5 mb-4 leading-relaxed">
            Free beta spots are full, but you can still subscribe — use a card above,
            then complete checkout from Account.
          </p>
        )}
        <p className="text-xs text-neutral-500 leading-relaxed">
          <span className="text-neutral-700 font-medium">Current focus:</span>{" "}
          {selectionSummary}. Use the button on the plan you want — each card saves that
          choice for after you log in.
        </p>
      </div>
    </div>
  );
}
