"use client";

import { useMemo, useState } from "react";

type DemoCase = {
  id: string;
  label: string;
  command: string;
  output: string[];
};

const CASES: DemoCase[] = [
  {
    id: "created",
    label: "New site created",
    command:
      "tg new --channel my-notes --template blog --subdomain notes --wait",
    output: [
      "✔ Authenticated as @tinyfriend",
      "→ Creating site (channel: my-notes, template: blog, subdomain: notes)",
      "→ Building and publishing...",
      "✔ Site is live at https://notes.tiny.garden",
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
  },
  {
    id: "backup",
    label: "Local backup export",
    command: "tg site backup notes --out ~/Sites/notes-archive",
    output: [
      "→ Resolving export metadata...",
      "→ Downloading hosted HTML...",
      "→ Writing ~/Sites/notes-archive/index.html",
      "✔ Backup saved locally.",
    ],
  },
];

export function CliTerminalDemo() {
  const [selectedId, setSelectedId] = useState<string>(CASES[0].id);
  const selected = useMemo(
    () => CASES.find((c) => c.id === selectedId) || CASES[0],
    [selectedId]
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
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

      <div className="border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden bg-neutral-950 text-neutral-100">
        <div className="px-3 py-2 border-b border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
          <span>tiny.garden terminal session</span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            running
          </span>
        </div>
        <div className="p-3 font-mono text-[11px] leading-relaxed min-h-44">
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
    </div>
  );
}
