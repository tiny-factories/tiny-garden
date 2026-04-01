"use client";

import type { ReactElement, ReactNode } from "react";

const drift = "landing-hero-block-drift";

function FeatureIconShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm sm:size-[3.75rem]"
      aria-hidden
    >
      {children}
    </div>
  );
}

function IconArenaNative() {
  return (
    <FeatureIconShell>
      <div className="grid h-full grid-cols-3 grid-rows-2 gap-0.5 p-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`${drift} rounded-sm ${
              i === 0
                ? "bg-linear-to-br from-amber-100 to-amber-50"
                : i === 3
                  ? "bg-linear-to-br from-sky-100/90 to-neutral-100"
                  : "bg-neutral-200/80"
            }`}
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    </FeatureIconShell>
  );
}

function IconSubdomain() {
  return (
    <FeatureIconShell>
      <div className="flex h-full flex-col justify-center gap-1 px-2 py-1.5">
        <div className={`flex gap-0.5 ${drift}`} style={{ animationDelay: "0ms" }}>
          <span className="size-1 rounded-full bg-neutral-300" />
          <span className="size-1 rounded-full bg-neutral-200" />
          <span className="size-1 rounded-full bg-neutral-200" />
        </div>
        <div
          className={`${drift} h-2 w-full rounded border border-neutral-200 bg-white`}
          style={{ animationDelay: "140ms" }}
        />
        <p
          className={`truncate text-center font-mono text-[6px] leading-none tracking-tight text-neutral-400 ${drift}`}
          style={{ animationDelay: "280ms" }}
        >
          yoursite.tiny.garden
        </p>
      </div>
    </FeatureIconShell>
  );
}

function IconStaticFast() {
  return (
    <FeatureIconShell>
      <div className="relative flex h-full items-center justify-center p-2">
        <div
          className={`absolute w-[68%] ${drift} h-[58%] rounded border border-neutral-200 bg-neutral-100`}
          style={{ animationDelay: "0ms" }}
        />
        <div
          className={`relative z-10 flex h-[58%] w-[68%] flex-col justify-center rounded border border-neutral-300 bg-white p-1 shadow-sm ${drift}`}
          style={{ animationDelay: "220ms" }}
        >
          <div className="mb-0.5 h-0.5 w-full rounded-full bg-neutral-200" />
          <div className="h-0.5 w-4/5 rounded-full bg-neutral-100" />
        </div>
      </div>
    </FeatureIconShell>
  );
}

function IconTemplates() {
  return (
    <FeatureIconShell>
      <div className="flex h-full items-end justify-center gap-1 px-2 pb-2 pt-3">
        {[
          { h: "h-4", delay: "0ms" },
          { h: "h-6", delay: "100ms" },
          { h: "h-5", delay: "200ms" },
        ].map(({ h, delay }, i) => (
          <div
            key={i}
            className={`w-2 rounded-sm bg-linear-to-t from-neutral-400/50 to-neutral-100 ${drift} ${h}`}
            style={{ animationDelay: delay }}
          />
        ))}
      </div>
    </FeatureIconShell>
  );
}

function IconRebuild() {
  return (
    <FeatureIconShell>
      <div className="flex h-full items-center justify-center p-2">
        <div
          className={`landing-feature-rebuild-ring flex size-9 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 bg-white/80`}
        >
          <div className={`${drift} size-2 rounded-full bg-neutral-900`} style={{ animationDelay: "0ms" }} />
        </div>
      </div>
    </FeatureIconShell>
  );
}

function IconNoLockIn() {
  return (
    <FeatureIconShell>
      <div className="flex h-full items-center justify-center gap-1 px-2">
        <div
          className={`${drift} size-3 rounded border border-neutral-300 bg-white`}
          style={{ animationDelay: "0ms" }}
        />
        <div
          className={`${drift} h-px w-5 max-w-full bg-linear-to-r from-neutral-300 to-emerald-300/60`}
          style={{ animationDelay: "120ms" }}
        />
        <div
          className={`${drift} size-3 rounded border border-emerald-200 bg-emerald-50`}
          style={{ animationDelay: "240ms" }}
        />
      </div>
    </FeatureIconShell>
  );
}

const FEATURE_ROWS: {
  title: string;
  desc: string;
  Icon: () => ReactElement;
}[] = [
  {
    title: "Are.na-native",
    desc: "Your channel is your CMS. Add a block in Are.na, rebuild your site — images, text, links, embeds, and attachments all supported.",
    Icon: IconArenaNative,
  },
  {
    title: "Custom subdomains",
    desc: "Every site gets its own subdomain at your-name.tiny.garden. Clean, memorable URLs.",
    Icon: IconSubdomain,
  },
  {
    title: "Static & fast",
    desc: "Sites are pre-built HTML and CSS. No JavaScript, no loading spinners. Just content.",
    Icon: IconStaticFast,
  },
  {
    title: "Multiple templates",
    desc: "Blog for writing, portfolio for images, feed for quick updates. Pick the layout that fits.",
    Icon: IconTemplates,
  },
  {
    title: "One-click rebuild",
    desc: "Updated your channel? Hit rebuild and your site is current in seconds.",
    Icon: IconRebuild,
  },
  {
    title: "No lock-in",
    desc: "Your content stays in Are.na. If you leave, nothing is lost.",
    Icon: IconNoLockIn,
  },
];

export function LandingFeatures() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100">
      <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-8">
        Features
      </h2>
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2">
        {FEATURE_ROWS.map(({ title, desc, Icon }) => (
          <div key={title} className="flex gap-4 sm:gap-5">
            <Icon />
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-neutral-900">{title}</p>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
