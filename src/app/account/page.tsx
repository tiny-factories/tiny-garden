"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/track";

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
    setUpgrading(true);
    const res = await fetch("/api/billing/checkout", { method: "POST" });
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
                {{ free: "3 sites, manual rebuild", pro: "Lifetime access, unlimited sites, daily auto-rebuild", studio: "50 sites, daily auto-rebuild" }[account.plan] || "3 sites"}
              </p>
            </div>
            {account.plan === "free" && (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgrading}
                className="text-xs px-3 py-1.5 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {upgrading ? "Loading..." : "Become a supporter"}
              </button>
            )}
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
