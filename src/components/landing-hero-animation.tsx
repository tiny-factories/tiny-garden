"use client";

/** Shared outer frame so connect / template / publish read as one row. */
const HOW_IT_WORKS_ARTIFACT_BOX = "mx-auto mb-5 h-[180px] w-full max-w-[220px]";

/** Same gradients on channel tiles and site sections so it reads as one dataset, new layout. */
const blk = {
  hero: "bg-linear-to-br from-amber-200/90 via-amber-50/80 to-stone-400/70 border-amber-300/35",
  note: "border-violet-300/35 bg-linear-to-br from-violet-200/88 to-fuchsia-50/65",
  thumb: "border-sky-300/40 bg-linear-to-br from-sky-300/85 to-cyan-100/70",
  wide: "border-rose-300/30 bg-linear-to-br from-rose-200/82 to-orange-50/60",
  pairA: "border-emerald-300/35 bg-linear-to-br from-emerald-200/75 to-teal-50/55",
  pairB: "border-indigo-300/35 bg-linear-to-br from-indigo-200/80 to-violet-50/60",
} as const;

function ChannelToolbar() {
  return (
    <div className="mb-2 flex items-center gap-1">
      <span className="truncate text-[9px] font-medium tracking-tight text-neutral-600 dark:text-neutral-300">
        reference library
      </span>
      <div className="ml-auto flex items-center gap-0.5">
        <button
          type="button"
          tabIndex={-1}
          className="flex size-5 items-center justify-center rounded border border-neutral-200 bg-white dark:border-neutral-600 dark:bg-neutral-800"
          aria-hidden
        >
          <span className="grid grid-cols-2 gap-px">
            <span className="size-1 rounded-[1px] bg-neutral-400" />
            <span className="size-1 rounded-[1px] bg-neutral-400" />
            <span className="size-1 rounded-[1px] bg-neutral-400" />
            <span className="size-1 rounded-[1px] bg-neutral-400" />
          </span>
        </button>
        <button
          type="button"
          tabIndex={-1}
          className="flex size-5 items-center justify-center rounded border border-neutral-200 bg-white dark:border-neutral-600 dark:bg-neutral-800"
          aria-hidden
        >
          <span className="text-[10px] font-semibold leading-none text-neutral-500 dark:text-neutral-400">
            ↗
          </span>
        </button>
      </div>
    </div>
  );
}

/** Three mini layout thumbnails with a cycling “selected” ring (how it works — step 2). */
function TemplateChoiceIllustration() {
  return (
    <div className="flex h-full min-h-0 w-full gap-1.5 rounded-md" aria-hidden>
      <div className="landing-how-tpl-card-0 flex min-h-0 flex-1 flex-col gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-900">
        <div className={`h-3 shrink-0 rounded-sm border ${blk.hero}`} />
        <div className={`mt-auto min-h-0 flex-1 rounded-sm border ${blk.note}`} />
      </div>
      <div className="landing-how-tpl-card-1 flex min-h-0 flex-1 flex-col gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-900">
        <div className={`h-2 w-full shrink-0 rounded-sm border ${blk.wide}`} />
        <div className={`h-2 w-4/5 shrink-0 rounded-sm border ${blk.thumb}`} />
        <div className={`mt-auto min-h-0 flex-1 rounded-sm border ${blk.pairA}`} />
      </div>
      <div className="landing-how-tpl-card-2 flex min-h-0 flex-1 flex-col gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex shrink-0 gap-0.5">
          <div className={`h-9 flex-1 rounded-sm border ${blk.pairA}`} />
          <div className={`h-9 flex-1 rounded-sm border ${blk.pairB}`} />
        </div>
        <div className={`min-h-0 flex-1 rounded-sm border ${blk.hero}`} />
      </div>
    </div>
  );
}

function ArenaChannelGrid() {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1.5 [grid-template-rows:minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
      <div
        className={`landing-hero-block-drift row-span-2 rounded border ${blk.hero}`}
        style={{ animationDelay: "0ms" }}
      />
      <div
        className={`landing-hero-block-drift space-y-1 rounded border p-1.5 ${blk.note}`}
        style={{ animationDelay: "100ms" }}
      >
        <div className="h-1 w-full rounded-sm bg-white/50" />
        <div className="h-1 w-[85%] rounded-sm bg-white/35" />
      </div>
      <div
        className={`landing-hero-block-drift rounded border ${blk.thumb}`}
        style={{ animationDelay: "200ms" }}
      >
        <div className="aspect-square rounded-sm bg-white/15" />
      </div>
      <div
        className={`landing-hero-block-drift col-span-2 space-y-1 rounded border p-1.5 ${blk.wide}`}
        style={{ animationDelay: "280ms" }}
      >
        <div className="h-1 w-full rounded-sm bg-white/45" />
        <div className="h-1 w-[92%] rounded-sm bg-white/35" />
        <div className="h-1 w-[55%] rounded-sm bg-white/30" />
      </div>
      <div
        className={`landing-hero-block-drift rounded border ${blk.pairA}`}
        style={{ animationDelay: "360ms" }}
      />
      <div
        className={`landing-hero-block-drift rounded border ${blk.pairB}`}
        style={{ animationDelay: "440ms" }}
      />
    </div>
  );
}

function ArenaChannel({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "miniScroll";
}) {
  return (
    <div
      className={`rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900 ${className ?? ""}`}
    >
      <div className="flex items-center gap-1 border-b border-neutral-200/80 pb-1.5 dark:border-neutral-600/80">
        <span className="size-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        <span className="size-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <span className="ml-1 text-[9px] font-medium tracking-wide text-neutral-400 dark:text-neutral-500">
          are.na
        </span>
      </div>
      <div className="pt-2">
        <ChannelToolbar />
        {variant === "miniScroll" ? (
          <div className="relative mt-0.5 h-[82px] overflow-hidden rounded-md">
            <div className="landing-how-works-scroll">
              <div className="pb-1.5">
                <ArenaChannelGrid />
              </div>
              <div className="pb-1.5" aria-hidden>
                <ArenaChannelGrid />
              </div>
            </div>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-5 bg-linear-to-b from-neutral-50 to-transparent dark:from-neutral-900"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-5 bg-linear-to-t from-neutral-50 to-transparent dark:from-neutral-900"
              aria-hidden
            />
          </div>
        ) : (
          <ArenaChannelGrid />
        )}
      </div>
    </div>
  );
}

function SiteLayoutA() {
  return (
    <div className="space-y-0">
      <div className={`mx-1 mt-1 h-14 rounded-md border ${blk.hero}`} />
      <div className="mx-1 mt-1.5 flex gap-1.5">
        <div className={`w-[38%] space-y-1 rounded-md border p-1.5 ${blk.note}`}>
          <div className="h-1 w-full rounded-sm bg-white/50" />
          <div className="h-1 w-[80%] rounded-sm bg-white/35" />
          <div className="h-1 w-full rounded-sm bg-white/40" />
        </div>
        <div className={`min-h-[52px] flex-1 rounded-md border ${blk.thumb}`}>
          <div className="h-full min-h-[52px] rounded-sm bg-white/10" />
        </div>
      </div>
      <div className={`mx-1 mt-1.5 space-y-1 rounded-md border p-1.5 ${blk.wide}`}>
        <div className="h-1 w-full rounded-sm bg-white/45" />
        <div className="h-1 w-[70%] rounded-sm bg-white/35" />
      </div>
      <div className="mx-1 mt-1.5 flex gap-1.5">
        <div className={`h-11 flex-1 rounded-md border ${blk.pairA}`} />
        <div className={`h-11 flex-1 rounded-md border ${blk.pairB}`} />
      </div>
    </div>
  );
}

/** Same block colors, different vertical order — reveals after “reload”. */
function SiteLayoutB() {
  return (
    <div className="space-y-0">
      <div className="landing-hero-b-row-0 mx-1 mt-1 flex gap-1.5">
        <div className={`h-10 flex-1 rounded-md border ${blk.pairA}`} />
        <div className={`h-10 flex-1 rounded-md border ${blk.pairB}`} />
      </div>
      <div className={`landing-hero-b-row-1 mx-1 mt-1.5 space-y-1 rounded-md border p-1.5 ${blk.wide}`}>
        <div className="h-1 w-full rounded-sm bg-white/45" />
        <div className="h-1 w-[78%] rounded-sm bg-white/35" />
        <div className="h-1 w-[50%] rounded-sm bg-white/30" />
      </div>
      <div className={`landing-hero-b-row-2 mx-1 mt-1.5 space-y-1 rounded-md border p-1.5 ${blk.note}`}>
        <div className="h-1 w-full rounded-sm bg-white/50" />
        <div className="h-1 w-[88%] rounded-sm bg-white/35" />
      </div>
      <div className={`landing-hero-b-row-3 mx-1 mt-1.5 h-12 rounded-md border ${blk.thumb}`}>
        <div className="h-full rounded-sm bg-white/10" />
      </div>
      <div className={`landing-hero-b-row-4 mx-1 mt-1.5 h-11 rounded-md border ${blk.hero}`} />
    </div>
  );
}

function SitePageScroll({
  className,
  variant = "animated",
}: {
  className?: string;
  variant?: "animated" | "static" | "howItWorks";
}) {
  if (variant === "static") {
    return (
      <div className={`overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 ${className ?? ""}`}>
        <div className="flex h-7 items-center gap-1.5 border-b border-neutral-800 bg-neutral-900 px-2">
          <span className="size-1.5 rounded-full bg-red-400/90" />
          <span className="size-1.5 rounded-full bg-amber-300/90" />
          <span className="size-1.5 rounded-full bg-emerald-400/80" />
          <span className="ml-1 truncate font-mono text-[8px] text-neutral-500">yoursite.tiny.garden</span>
        </div>
        <div className="relative h-[132px] overflow-hidden bg-neutral-50 dark:bg-neutral-900">
          <SiteLayoutA />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-linear-to-b from-neutral-50 to-transparent dark:from-neutral-900"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-neutral-50 to-transparent dark:from-neutral-900"
            aria-hidden
          />
        </div>
      </div>
    );
  }

  if (variant === "howItWorks") {
    return (
      <div className={`overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 ${className ?? ""}`}>
        <div className="flex h-7 items-center gap-1.5 border-b border-neutral-800 bg-neutral-900 px-2">
          <span className="size-1.5 rounded-full bg-red-400/90" />
          <span className="size-1.5 rounded-full bg-amber-300/90" />
          <span className="size-1.5 rounded-full bg-emerald-400/80" />
          <span className="ml-1 truncate font-mono text-[8px] text-neutral-500">yoursite.tiny.garden</span>
        </div>
        <div className="relative h-[132px] overflow-hidden bg-neutral-50 dark:bg-neutral-900">
          <div className="landing-how-works-scroll">
            <div className="pb-1">
              <SiteLayoutA />
            </div>
            <div className="pb-1" aria-hidden>
              <SiteLayoutA />
            </div>
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-6 bg-linear-to-b from-neutral-50 to-transparent dark:from-neutral-900"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-8 bg-linear-to-t from-neutral-50 to-transparent dark:from-neutral-900"
            aria-hidden
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 ${className ?? ""}`}>
      <div className="landing-hero-chrome-dim flex h-7 items-center gap-1.5 border-b border-neutral-800 bg-neutral-900 px-2">
        <span className="size-1.5 shrink-0 rounded-full bg-red-400/90" />
        <span className="size-1.5 shrink-0 rounded-full bg-amber-300/90" />
        <span className="size-1.5 shrink-0 rounded-full bg-emerald-400/80" />
        <span className="min-w-0 flex-1 truncate text-center font-mono text-[8px] text-neutral-500">
          yoursite.tiny.garden
        </span>
        <button
          type="button"
          tabIndex={-1}
          className="landing-hero-reload-btn motion-reduce:animate-none ml-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-neutral-700 bg-neutral-900"
          aria-hidden
        >
          <span className="landing-hero-reload-spin text-[11px] leading-none text-neutral-400 motion-reduce:animate-none">
            ↻
          </span>
        </button>
      </div>
      <div className="relative h-[132px] overflow-hidden bg-neutral-50 dark:bg-neutral-900">
        <div className="landing-hero-site-layout-a absolute inset-0">
          <div className="landing-hero-scroll-content">
            <div className="pb-1">
              <SiteLayoutA />
            </div>
            <div className="pb-1" aria-hidden>
              <SiteLayoutA />
            </div>
          </div>
        </div>
        <div className="landing-hero-site-layout-b absolute inset-0">
          <div className="landing-hero-scroll-content">
            <div className="pb-1">
              <SiteLayoutB />
            </div>
            <div className="pb-1" aria-hidden>
              <SiteLayoutB />
            </div>
          </div>
        </div>
        <div
          className="landing-hero-reload-flash pointer-events-none absolute inset-0 z-20 bg-white motion-reduce:hidden"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-linear-to-b from-neutral-50 to-transparent dark:from-neutral-900"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-linear-to-t from-neutral-50 to-transparent dark:from-neutral-900"
          aria-hidden
        />
      </div>
    </div>
  );
}

function LoadingShroud() {
  return (
    <div className="landing-hero-loading-overlay pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-white/88 backdrop-blur-[2px] motion-reduce:hidden">
      <p className="text-[9px] font-medium tracking-wide text-neutral-500">Publishing layout</p>
      <div className="mt-2 h-0.5 w-[55%] overflow-hidden rounded-full bg-neutral-200">
        <div className="landing-hero-loading-bar h-full w-full rounded-full bg-neutral-800" />
      </div>
    </div>
  );
}

/** Step 1 — Are.na channel grid (same asset as hero, block drift). */
export function HowItWorksConnectIllustration({ className }: { className?: string }) {
  return (
    <div className={`${HOW_IT_WORKS_ARTIFACT_BOX} ${className ?? ""}`} aria-hidden>
      <div className="flex h-full items-center justify-center overflow-hidden">
        <div className="w-full origin-center scale-[0.86] sm:scale-[0.88]">
          <ArenaChannel className="w-full" variant="miniScroll" />
        </div>
      </div>
    </div>
  );
}

/** Step 2 — template thumbnails with cycling selection ring. Parent should set `how-it-works-tpl-scope` for theme-aware outlines. */
export function HowItWorksTemplateIllustration({ className }: { className?: string }) {
  return (
    <div className={`${HOW_IT_WORKS_ARTIFACT_BOX} ${className ?? ""}`} aria-hidden>
      <div className="box-border flex h-full min-h-0 w-full px-0.5 py-1">
        <TemplateChoiceIllustration />
      </div>
    </div>
  );
}

/** Step 3 — live site chrome + same block colors as channel (static). */
export function HowItWorksPublishIllustration({ className }: { className?: string }) {
  return (
    <div className={`${HOW_IT_WORKS_ARTIFACT_BOX} ${className ?? ""}`} aria-hidden>
      <div className="flex h-full items-center justify-center">
        <SitePageScroll className="w-full shrink-0" variant="howItWorks" />
      </div>
    </div>
  );
}

export function LandingHeroAnimation() {
  return (
    <div className="mx-auto mt-10 w-full max-w-sm" aria-hidden>
      <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
        Same blocks, new template
      </p>

      <div className="relative mx-auto h-[208px] max-w-[288px] motion-reduce:hidden">
        <div className="landing-hero-arena-layer absolute inset-0 overflow-hidden rounded-lg">
          <ArenaChannel className="h-full" />
          <LoadingShroud />
        </div>
        <div className="landing-hero-web-layer absolute inset-0 overflow-hidden rounded-lg">
          <SitePageScroll className="h-full" />
        </div>
      </div>

      <div className="hidden flex-col items-center gap-3 px-2 motion-reduce:flex">
        <div className="flex items-start justify-center gap-3">
          <ArenaChannel className="w-[148px] shrink-0" />
          <span className="mt-24 text-xs text-neutral-400">→</span>
          <SitePageScroll className="w-[148px] shrink-0" variant="static" />
        </div>
        <p className="text-center text-[10px] text-neutral-400">Shared colors = same channel content</p>
      </div>
    </div>
  );
}
