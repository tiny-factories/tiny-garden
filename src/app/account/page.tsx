"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { SegmentedControl } from "@/components/toolbar";
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

type AccountTab = "settings" | "subscription";

const ACCOUNT_MAIN_CLASS =
  "min-h-screen w-full min-w-0 max-w-4xl mx-auto px-4 py-16";

export default function AccountPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AccountTab>("settings");
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
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<
    "idle" | "loading" | "ok" | "err"
  >("idle");
  const [newsletterMessage, setNewsletterMessage] = useState("");

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

  async function handleNewsletterSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newsletterOptIn) return;
    const email = newsletterEmail.trim();
    if (!email) {
      setNewsletterStatus("err");
      setNewsletterMessage("Enter your email.");
      return;
    }
    setNewsletterStatus("loading");
    setNewsletterMessage("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && data.ok) {
        track("newsletter-subscribed");
        setNewsletterStatus("ok");
        setNewsletterMessage("You're subscribed. Check your inbox to confirm.");
        return;
      }
      setNewsletterStatus("err");
      setNewsletterMessage(
        data.error ||
          (res.status === 503
            ? "Newsletter isn't configured yet."
            : "Something went wrong. Try again.")
      );
    } catch {
      setNewsletterStatus("err");
      setNewsletterMessage("Network error. Try again.");
    }
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
      <main className={ACCOUNT_MAIN_CLASS}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="h-6 w-28 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-9 w-full max-w-[19rem] animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-3 w-48 bg-neutral-50 rounded dark:bg-neutral-900" />
            <div className="h-24 bg-neutral-50 rounded dark:bg-neutral-900" />
          </div>
        </div>
      </main>
    );
  }

  if (!account) return null;

  return (
    <main className={ACCOUNT_MAIN_CLASS}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 pb-2 sm:flex-1">
            <div className="flex flex-wrap items-end justify-between gap-3 gap-y-2">
              <h1 className="text-lg font-medium text-neutral-950 dark:text-neutral-50">
                Account
              </h1>
              <Button variant="ghost" className="shrink-0" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
          <SegmentedControl<AccountTab>
            segments={[
              { value: "settings", label: "Settings" },
              { value: "subscription", label: "Subscription" },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel="Account sections"
            className="w-full max-w-[19rem] shrink-0 sm:w-[19rem] sm:self-end"
            labelClassName="px-3 text-xs font-medium"
          />
        </div>

        <div className="outline-none">
          {activeTab === "settings" && (
            <div className="flex flex-col gap-8">
              <section className="p-4 border border-neutral-100 rounded dark:border-neutral-800">
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
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {account.siteCount} site{account.siteCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://www.are.na/${account.arenaUsername}`}
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors dark:hover:text-neutral-300 dark:text-neutral-500"
                >
                  View Are.na profile
                </a>
              </section>

              <section className="p-4 border border-neutral-100 rounded dark:border-neutral-800">
                <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3">
                  Email updates
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed max-w-xl">
                  Occasional updates on new templates, features, and changes. Off by default —
                  opt in and we&apos;ll send you an email whenever we have something worth sharing.
                </p>
                <form onSubmit={handleNewsletterSubscribe} className="space-y-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newsletterOptIn}
                      onChange={(e) => {
                        setNewsletterOptIn(e.target.checked);
                        if (!e.target.checked) {
                          setNewsletterStatus("idle");
                          setNewsletterMessage("");
                        }
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-neutral-900 dark:accent-neutral-100"
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      Subscribe to tiny.garden updates
                    </span>
                  </label>
                  {newsletterOptIn && (
                    <div className="flex flex-col sm:flex-row gap-2 pl-6">
                      <label htmlFor="newsletter-email" className="sr-only">
                        Email
                      </label>
                      <input
                        id="newsletter-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@email.com"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        disabled={
                          newsletterStatus === "loading" ||
                          newsletterStatus === "ok"
                        }
                        className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        size="xs"
                        disabled={
                          newsletterStatus === "loading" ||
                          newsletterStatus === "ok" ||
                          !newsletterEmail.trim()
                        }
                      >
                        {newsletterStatus === "loading"
                          ? "…"
                          : newsletterStatus === "ok"
                            ? "Subscribed"
                            : "Subscribe"}
                      </Button>
                    </div>
                  )}
                  {newsletterMessage && (
                    <p
                      className={`text-xs pl-6 ${
                        newsletterStatus === "ok"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {newsletterMessage}
                    </p>
                  )}
                </form>
              </section>

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
                <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete account"}
                </Button>
                <p className="text-xs text-neutral-300 px-1 dark:text-neutral-500">
                  Deleting your account removes your sites and data from tiny.garden.
                  Your Are.na account is not affected.
                </p>
              </section>
            </div>
          )}

          {activeTab === "subscription" && (
            <section>
              <div className="p-4 border border-neutral-100 rounded dark:border-neutral-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {{ free: "Free", pro: "Supporter", studio: "Studio" }[account.plan] || "Free"}{" "}
                      plan
                      {account.isAdmin && (
                        <span className="ml-2 inline-block text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded dark:bg-amber-950/60 dark:text-amber-200">
                          Admin
                        </span>
                      )}
                      {account.isFriend && !account.isAdmin && (
                        <span className="ml-2 inline-block text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded dark:bg-green-950/50 dark:text-green-300">
                          Friend
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 dark:text-neutral-500">
                      {
                        {
                          free: "3 sites, manual rebuild — or subscribe from Pricing (Individual / Studio)",
                          pro: "Unlimited sites, daily auto-rebuild",
                          studio: "50 sites, daily auto-rebuild",
                        }[account.plan] || "3 sites"
                      }
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    {account.plan === "free" &&
                      (() => {
                        const cents = getCentsForSelection(
                          checkoutPlan,
                          checkoutIndividualStep,
                          checkoutStudioLevel
                        );
                        if (cents <= 0) {
                          return (
                            <p className="text-[11px] text-neutral-400 max-w-[14rem] leading-relaxed dark:text-neutral-500 sm:ml-auto">
                              <Link
                                href="/#pricing"
                                className="text-neutral-600 underline underline-offset-2 dark:text-neutral-400"
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
                          <Button
                            variant="primary"
                            size="xs"
                            className="shrink-0"
                            onClick={handleUpgrade}
                            disabled={upgrading}
                          >
                            {upgrading ? "Loading..." : `Subscribe · ${subLabel}`}
                          </Button>
                        );
                      })()}
                    {account.plan === "pro" && (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        {account.subscriptionStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
