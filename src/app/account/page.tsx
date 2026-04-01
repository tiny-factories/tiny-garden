"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "@/lib/track";
import {
  INDIVIDUAL_STEP_LABELS,
  PWYC_AMOUNT_STORAGE_KEY,
  PWYC_DEFAULT_INDIVIDUAL_STEP,
  PWYC_DEFAULT_STUDIO_LEVEL,
  PWYC_LEGACY_TIER_STORAGE_KEY,
  PWYC_SELECTION_KEY,
  findSelectionForAmountCents,
  formatUsdPerMonth,
  getCentsForSelection,
  isIndividualSliderStep,
  isPricingPlanId,
  isSupportLevel,
  legacyTierIdToAmountCents,
  normalizePaidAmountCents,
  type IndividualSliderStep,
  type PricingPlanId,
  type SupportLevel,
} from "@/lib/pricing-tiers";

const DANGER_SUFFIX = ", Will Robinson";
const TYPE_MS = 72;
const CARET_MS = 530;

interface Account {
  id: string;
  arenaUsername: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isFriend: boolean;
  plan: string;
  subscriptionStatus: string;
  siteCount: number;
  createdAt: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PricingPlanId>("individual");
  const [checkoutIndividualStep, setCheckoutIndividualStep] =
    useState<IndividualSliderStep>(PWYC_DEFAULT_INDIVIDUAL_STEP);
  const [checkoutStudioLevel, setCheckoutStudioLevel] =
    useState<SupportLevel>(PWYC_DEFAULT_STUDIO_LEVEL);
  const [dangerHover, setDangerHover] = useState(false);
  const [dangerTyped, setDangerTyped] = useState(0);
  const [caretVisible, setCaretVisible] = useState(true);
  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then(setAccount)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      const sel = localStorage.getItem(PWYC_SELECTION_KEY);
      if (sel) {
        const j = JSON.parse(sel) as {
          v?: number;
          plan?: string;
          level?: string;
          individualLevel?: string;
          studioLevel?: string;
          individualStep?: string;
        };
        if (
          j.v === 4 &&
          typeof j.plan === "string" &&
          isPricingPlanId(j.plan) &&
          typeof j.individualStep === "string" &&
          isIndividualSliderStep(j.individualStep) &&
          typeof j.studioLevel === "string" &&
          isSupportLevel(j.studioLevel)
        ) {
          setCheckoutPlan(j.plan);
          setCheckoutIndividualStep(j.individualStep);
          setCheckoutStudioLevel(j.studioLevel);
          return;
        }
        if (
          j.v === 3 &&
          typeof j.plan === "string" &&
          isPricingPlanId(j.plan) &&
          typeof j.individualLevel === "string" &&
          isSupportLevel(j.individualLevel) &&
          typeof j.studioLevel === "string" &&
          isSupportLevel(j.studioLevel)
        ) {
          setCheckoutPlan(j.plan);
          setCheckoutIndividualStep(j.individualLevel);
          setCheckoutStudioLevel(j.studioLevel);
          return;
        }
        if (
          j.v === 2 &&
          typeof j.plan === "string" &&
          isPricingPlanId(j.plan) &&
          typeof j.level === "string" &&
          isSupportLevel(j.level)
        ) {
          setCheckoutPlan(j.plan);
          if (j.plan === "individual") {
            setCheckoutIndividualStep(j.level);
            setCheckoutStudioLevel(PWYC_DEFAULT_STUDIO_LEVEL);
          } else {
            setCheckoutIndividualStep(PWYC_DEFAULT_INDIVIDUAL_STEP);
            setCheckoutStudioLevel(j.level);
          }
          return;
        }
      }
      const raw = localStorage.getItem(PWYC_AMOUNT_STORAGE_KEY);
      if (raw != null) {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n)) {
          const cents = normalizePaidAmountCents(n);
          const sel = findSelectionForAmountCents(cents);
          setCheckoutPlan(sel.plan);
          setCheckoutIndividualStep(sel.individualStep);
          setCheckoutStudioLevel(sel.studioLevel);
          return;
        }
      }
      const legacyTier = localStorage.getItem(PWYC_LEGACY_TIER_STORAGE_KEY);
      if (legacyTier) {
        const cents = legacyTierIdToAmountCents(legacyTier);
        if (cents !== undefined) {
          const normalized = normalizePaidAmountCents(cents);
          const sel = findSelectionForAmountCents(normalized);
          setCheckoutPlan(sel.plan);
          setCheckoutIndividualStep(sel.individualStep);
          setCheckoutStudioLevel(sel.studioLevel);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!dangerHover) {
      if (typeIntervalRef.current) {
        clearInterval(typeIntervalRef.current);
        typeIntervalRef.current = null;
      }
      setDangerTyped(0);
      setCaretVisible(true);
      return;
    }

    setDangerTyped(0);
    let i = 0;
    typeIntervalRef.current = setInterval(() => {
      i += 1;
      setDangerTyped(i);
      if (i >= DANGER_SUFFIX.length) {
        if (typeIntervalRef.current) {
          clearInterval(typeIntervalRef.current);
          typeIntervalRef.current = null;
        }
      }
    }, TYPE_MS);

    return () => {
      if (typeIntervalRef.current) {
        clearInterval(typeIntervalRef.current);
        typeIntervalRef.current = null;
      }
    };
  }, [dangerHover]);

  useEffect(() => {
    if (!dangerHover) return;
    const id = setInterval(() => setCaretVisible((v) => !v), CARET_MS);
    return () => clearInterval(id);
  }, [dangerHover]);

  async function handleUpgrade() {
    track("upgrade-started");
    const amountCents = getCentsForSelection(
      checkoutPlan,
      checkoutIndividualStep,
      checkoutStudioLevel
    );
    if (amountCents <= 0) {
      return;
    }
    setUpgrading(true);
    const normalized = normalizePaidAmountCents(amountCents);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents: normalized,
        pricingPlan: checkoutPlan,
      }),
    });
    if (res.ok) {
      const { url } = await res.json();
      if (url) window.location.href = url;
    }
    setUpgrading(false);
  }

  async function handleLogout() {
    track("logged-out");
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  async function handleDelete() {
    const confirmed = prompt(
      'This will permanently delete your account and all your sites. Type "delete" to confirm.'
    );
    if (confirmed !== "delete") return;

    track("account-deleted");
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      router.push("/");
    } else {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-neutral-100 rounded" />
          <div className="h-3 w-48 bg-neutral-50 rounded" />
          <div className="h-24 bg-neutral-50 rounded" />
        </div>
      </main>
    );
  }

  if (!account) return null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-lg font-medium">Account</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          Log out
        </button>
      </div>

      {/* Profile */}
      <section className="mb-8 p-4 border border-neutral-100 rounded">
        <div className="flex items-center gap-3 mb-4">
          {account.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          )}
          <div>
            <p className="text-sm font-medium">{account.arenaUsername}</p>
            <p className="text-xs text-neutral-400">
              {account.siteCount} site{account.siteCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <a
          href={`https://www.are.na/${account.arenaUsername}`}
          target="_blank"
          rel="noopener"
          className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          View Are.na profile
        </a>
      </section>

      {/* Subscription */}
      <section className="mb-8">
        <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-3">
          Subscription
        </h2>
        <div className="p-4 border border-neutral-100 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {{ free: "Free", pro: "Supporter", studio: "Studio" }[account.plan] || "Free"} plan
                {account.isAdmin && (
                  <span className="ml-2 inline-block text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                    Admin
                  </span>
                )}
                {account.isFriend && !account.isAdmin && (
                  <span className="ml-2 inline-block text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                    Friend
                  </span>
                )}
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {
                  {
                    free: "3 sites, manual rebuild — or subscribe from Pricing (Individual / Studio)",
                    pro: "Unlimited sites, daily auto-rebuild",
                    studio: "50 sites, daily auto-rebuild",
                  }[account.plan] || "3 sites"
                }
              </p>
            </div>
            {account.plan === "free" &&
              (() => {
                const cents = getCentsForSelection(
                  checkoutPlan,
                  checkoutIndividualStep,
                  checkoutStudioLevel
                );
                if (cents <= 0) {
                  return (
                    <p className="text-[11px] text-neutral-400 max-w-[11rem] text-right leading-relaxed">
                      <Link
                        href="/#pricing"
                        className="text-neutral-600 underline underline-offset-2"
                      >
                        Pricing
                      </Link>{" "}
                      — pick a paid tier to subscribe here.
                    </p>
                  );
                }
                const subLabel =
                  checkoutPlan === "studio"
                    ? `Studio · ${formatUsdPerMonth(cents)}`
                    : `Individual · ${INDIVIDUAL_STEP_LABELS[checkoutIndividualStep]} · ${formatUsdPerMonth(cents)}`;
                return (
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="text-xs px-3 py-1.5 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    {upgrading ? "Loading..." : `Subscribe · ${subLabel}`}
                  </button>
                );
              })()}
            {account.plan === "pro" && (
              <span className="text-xs text-neutral-400">
                {account.subscriptionStatus}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Danger */}
      <section
        className="space-y-3"
        onMouseEnter={() => setDangerHover(true)}
        onMouseLeave={() => setDangerHover(false)}
      >
        <h2
          className={`text-xs font-medium uppercase tracking-wide mb-3 transition-colors ${
            dangerHover ? "text-red-500" : "text-red-400/90"
          }`}
        >
          <span>Danger</span>
          {dangerHover && (
            <>
              <span>{DANGER_SUFFIX.slice(0, dangerTyped)}</span>
              <span
                className="inline-block w-[0.5ch] text-center font-mono translate-y-px"
                style={{ opacity: caretVisible ? 1 : 0 }}
                aria-hidden
              >
                |
              </span>
            </>
          )}
        </h2>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="block w-full text-left text-sm px-4 py-3 border border-red-100 rounded text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete account"}
        </button>
        <p className="text-xs text-neutral-300 px-1">
          Deleting your account removes your sites and data from tiny.garden.
          Your Are.na account is not affected.
        </p>
      </section>
    </main>
  );
}
