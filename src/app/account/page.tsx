"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Account {
  id: string;
  arenaUsername: string;
  avatarUrl: string | null;
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

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then(setAccount)
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade() {
    setUpgrading(true);
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      if (url) window.location.href = url;
    }
    setUpgrading(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  async function handleDelete() {
    const confirmed = prompt(
      'This will permanently delete your account and all your sites. Type "delete" to confirm.'
    );
    if (confirmed !== "delete") return;

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
      <h1 className="text-lg font-medium mb-8">Account</h1>

      {/* Profile */}
      <section className="mb-8 p-4 border border-neutral-100 rounded">
        <div className="flex items-center gap-3 mb-4">
          {account.avatarUrl && (
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

      {/* Plan */}
      <section className="mb-8 p-4 border border-neutral-100 rounded">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {account.plan === "pro" ? "Pro" : "Free"} plan
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {account.plan === "pro"
                ? "Unlimited sites"
                : "1 site included"}
            </p>
          </div>
          {account.plan === "free" && (
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="text-xs px-3 py-1.5 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {upgrading ? "Loading..." : "Upgrade to Pro"}
            </button>
          )}
          {account.plan === "pro" && (
            <span className="text-xs text-neutral-400">
              {account.subscriptionStatus}
            </span>
          )}
        </div>
      </section>

      {/* Actions */}
      <section className="space-y-3">
        <button
          onClick={handleLogout}
          className="block w-full text-left text-sm px-4 py-3 border border-neutral-100 rounded hover:bg-neutral-50 transition-colors"
        >
          Log out
        </button>
        <button
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
