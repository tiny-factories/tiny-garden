"use client";

import { useState, type FormEvent } from "react";

export function ButtondownWaitlistForm({
  className = "",
  idPrefix = "waitlist",
  successMessage = "You’re on the list. We’ll email you when there’s room.",
}: {
  className?: string;
  idPrefix?: string;
  /** Shown after a successful subscribe (e.g. launch vs. beta capacity). */
  successMessage?: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    if (!email) {
      setStatus("err");
      setMessage("Enter your email.");
      return;
    }

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (res.ok && data.ok) {
        setStatus("ok");
        setMessage(successMessage);
        e.currentTarget.reset();
        return;
      }

      setStatus("err");
      setMessage(
        data.error ||
          (res.status === 503
            ? "Waitlist isn’t configured yet."
            : "Something went wrong. Try again.")
      );
    } catch {
      setStatus("err");
      setMessage("Network error. Try again.");
    }
  }

  const emailId = `${idPrefix}-email`;

  return (
    <form onSubmit={onSubmit} className={className}>
      <label htmlFor={emailId} className="sr-only">
        Email
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@email.com"
          disabled={status === "loading"}
          className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded outline-none focus:border-neutral-400 bg-white"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50 shrink-0"
        >
          {status === "loading" ? "…" : "Notify me"}
        </button>
      </div>
      {message && (
        <p
          className={`text-xs mt-2 ${
            status === "ok" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
