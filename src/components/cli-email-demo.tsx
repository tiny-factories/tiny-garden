"use client";

import { useMemo, useState } from "react";

type DemoCase = {
  id: string;
  label: string;
  command: string;
  output: string[];
  emailSubject: string;
  emailStatus: "Delivered" | "Action needed";
  emailBody: string[];
};

const CASES: DemoCase[] = [
  {
    id: "created",
    label: "New site created",
    command: "tg new --channel my-notes --template blog --subdomain notes --wait",
    output: [
      "✔ Authenticated as @tinyfriend",
      "→ Creating site (channel: my-notes, template: blog, subdomain: notes)",
      "→ Building and publishing...",
      "✔ Site is live at https://notes.tiny.garden",
    ],
    emailSubject: "Your site is live: notes.tiny.garden",
    emailStatus: "Delivered",
    emailBody: [
      "Your site finished building and is now published.",
      "Channel: My Notes",
      "Template: Blog",
      "Visit: https://notes.tiny.garden",
    ],
  },
  {
    id: "refreshed",
    label: "Manual refresh",
    command: "tg site refresh notes --wait",
    output: [
      "→ Refresh requested for notes.tiny.garden",
      "→ Build accepted (cooldown + quota checks passed)",
      "→ Rebuilding...",
      "✔ Refresh complete. Latest version is now live.",
    ],
    emailSubject: "Refresh complete for notes.tiny.garden",
    emailStatus: "Delivered",
    emailBody: [
      "Your manual refresh finished successfully.",
      "No action needed — your latest Are.na content is live.",
      "Triggered via CLI at 14:03 UTC.",
    ],
  },
  {
    id: "quota",
    label: "Quota reached",
    command: "tg site refresh notes",
    output: [
      "→ Refresh requested for notes.tiny.garden",
      "✖ Rebuild rejected",
      "code=build_quota_exceeded",
      "Daily rebuild quota reached for your plan.",
    ],
    emailSubject: "Refresh skipped: daily rebuild quota reached",
    emailStatus: "Action needed",
    emailBody: [
      "We skipped this refresh because your daily rebuild quota is currently reached.",
      "Try again tomorrow, or upgrade for a higher limit.",
      "Tip: use --wait for immediate completion feedback when accepted.",
    ],
  },
];

export function CliEmailDemo() {
  const [selectedId, setSelectedId] = useState<string>(CASES[0].id);
  const selected = useMemo(
    () => CASES.find((c) => c.id === selectedId) || CASES[0],
    [selectedId]
  );

  return (
    <section className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100 dark:border-neutral-800">
      <h2 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
        Interactive demo
      </h2>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-xl leading-relaxed">
        See how CLI actions can map to clear status emails for customers and teams.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {CASES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              selected.id === item.id
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
                : "border-neutral-200 hover:bg-neutral-50 text-neutral-600 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-neutral-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden bg-neutral-950 text-neutral-100">
          <div className="px-3 py-2 border-b border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>terminal</span>
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              running
            </span>
          </div>
          <div className="p-3 font-mono text-[11px] leading-relaxed">
            <p className="text-emerald-400">$ {selected.command}</p>
            <div className="mt-2 space-y-1.5">
              {selected.output.map((line, i) => (
                <p key={`${selected.id}-${i}`} className="text-neutral-200">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden bg-white dark:bg-neutral-950">
          <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 text-[11px] flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">
              tiny.garden notifications
            </span>
            <span
              className={`px-2 py-0.5 rounded-full border ${
                selected.emailStatus === "Delivered"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
              }`}
            >
              {selected.emailStatus}
            </span>
          </div>
          <div className="p-4">
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mb-1">
              Subject
            </p>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {selected.emailSubject}
            </p>
            <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              {selected.emailBody.map((line, i) => (
                <p
                  key={`${selected.id}-email-${i}`}
                  className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed"
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

