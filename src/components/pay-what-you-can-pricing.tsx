"use client";

import { BETA_SPOTS } from "@/lib/beta";
import { BetaCtaLink } from "@/components/beta-landing-shell";
import { ButtondownWaitlistForm } from "@/components/buttondown-waitlist-form";
import { LandingCard } from "@/components/landing-card";

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
    </div>
  );
}
