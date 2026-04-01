"use client";

import { useState, type FormEvent } from "react";

const TAG = "tiny-garden";

export function ButtondownWaitlistForm({
  className = "",
  idPrefix = "waitlist",
}: {
  className?: string;
  idPrefix?: string;
}) {
  const pub = process.env.NEXT_PUBLIC_BUTTONDOWN_USER?.trim();
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  if (!pub) {
    return (
      <p className={`text-xs text-amber-700 ${className}`}>
        Waitlist isn&apos;t configured yet (set NEXT_PUBLIC_BUTTONDOWN_USER).
      </p>
    );
  }

  const publication = pub;

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
      const body = new URLSearchParams();
      body.set("email", email);
      body.append("tag", TAG);

      const res = await fetch(
        `https://buttondown.email/api/emails/embed-subscribe/${encodeURIComponent(publication)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        }
      );

      if (res.ok) {
        setStatus("ok");
        setMessage("You’re on the list. We’ll email you when there’s room.");
        e.currentTarget.reset();
      } else {
        const text = await res.text();
        setStatus("err");
        setMessage(text || "Something went wrong. Try again.");
      }
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
