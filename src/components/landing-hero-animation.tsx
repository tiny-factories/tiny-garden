"use client";

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
      <span className="truncate text-[9px] font-medium tracking-tight text-neutral-600">
        reference library
      </span>
      <div className="ml-auto flex items-center gap-0.5">
        <button
          type="button"
          tabIndex={-1}
          className="flex size-5 items-center justify-center rounded border border-neutral-200 bg-white"
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
          className="flex size-5 items-center justify-center rounded border border-neutral-200 bg-white"
          aria-hidden
        >
          <span className="text-[10px] font-semibold leading-none text-neutral-500">↗</span>
        </button>
      </div>
    </div>
  );
}

function ArenaChannel({ className }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-neutral-200 bg-neutral-50 p-2 ${className ?? ""}`}>
      <div className="flex items-center gap-1 border-b border-neutral-200/80 pb-1.5">
        <span className="size-1.5 rounded-full bg-neutral-300" />
        <span className="size-1.5 rounded-full bg-neutral-200" />
        <span className="ml-1 text-[9px] font-medium tracking-wide text-neutral-400">are.na</span>
      </div>
      <div className="pt-2">
        <ChannelToolbar />
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
  variant?: "animated" | "static";
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
        <div className="relative h-[132px] overflow-hidden bg-neutral-50">
          <SiteLayoutA />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-linear-to-b from-neutral-50 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-neutral-50 to-transparent"
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
      <div className="relative h-[132px] overflow-hidden bg-neutral-50">
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
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-linear-to-b from-neutral-50 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-linear-to-t from-neutral-50 to-transparent"
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
