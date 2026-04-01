"use client";

function ArenaBlocks({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 shadow-sm ${className ?? ""}`}
    >
      <div className="mb-2 flex items-center gap-1 px-0.5">
        <span className="size-1.5 rounded-full bg-neutral-300" />
        <span className="size-1.5 rounded-full bg-neutral-200" />
        <span className="ml-auto text-[9px] font-medium tracking-wide text-neutral-400">
          are.na
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div
          className="landing-hero-block-drift col-span-1 row-span-2 rounded border border-neutral-200/80 bg-linear-to-br from-amber-100/90 to-neutral-200/80"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="landing-hero-block-drift space-y-1 rounded border border-neutral-200 bg-white p-1.5"
          style={{ animationDelay: "120ms" }}
        >
          <div className="h-1 w-full rounded-sm bg-neutral-200" />
          <div className="h-1 w-[80%] rounded-sm bg-neutral-100" />
        </div>
        <div
          className="landing-hero-block-drift rounded border border-neutral-200 bg-white"
          style={{ animationDelay: "240ms" }}
        >
          <div className="aspect-square rounded-sm bg-linear-to-tr from-sky-100 to-neutral-100" />
        </div>
        <div
          className="landing-hero-block-drift col-span-2 space-y-1 rounded border border-neutral-200 bg-white p-1.5"
          style={{ animationDelay: "360ms" }}
        >
          <div className="h-1 w-full rounded-sm bg-neutral-200" />
          <div className="h-1 w-full rounded-sm bg-neutral-100" />
          <div className="h-1 w-2/3 rounded-sm bg-neutral-100" />
        </div>
        <div
          className="landing-hero-block-drift rounded border border-dashed border-neutral-300 bg-white/60"
          style={{ animationDelay: "480ms" }}
        />
      </div>
    </div>
  );
}

function WebpageScroll({ className }: { className?: string }) {
  const stripe = (
    <>
      <div className="h-px w-full bg-neutral-100" />
      <div className="space-y-1.5 py-2">
        <div className="mx-auto h-16 w-[88%] rounded bg-linear-to-br from-neutral-100 to-neutral-50" />
        <div className="mx-auto w-[88%] space-y-1">
          <div className="h-1 w-full rounded-sm bg-neutral-200" />
          <div className="h-1 w-full rounded-sm bg-neutral-100" />
          <div className="h-1 w-3/5 rounded-sm bg-neutral-100" />
        </div>
      </div>
      <div className="h-px w-full bg-neutral-100" />
      <div className="flex gap-2 py-2">
        <div className="h-12 flex-1 rounded bg-neutral-100" />
        <div className="h-12 flex-1 rounded bg-neutral-100" />
      </div>
      <div className="h-px w-full bg-neutral-100" />
      <div className="space-y-1 py-2">
        <div className="h-1 w-full rounded-sm bg-neutral-200" />
        <div className="h-1 w-full rounded-sm bg-neutral-100" />
      </div>
    </>
  );

  return (
    <div
      className={`overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm ${className ?? ""}`}
    >
      <div className="flex h-7 items-center gap-1 border-b border-neutral-100 bg-neutral-50 px-2">
        <span className="size-2 rounded-full bg-neutral-200" />
        <span className="size-2 rounded-full bg-neutral-200" />
        <span className="size-2 rounded-full bg-neutral-200" />
        <span className="ml-2 truncate text-[9px] text-neutral-400">yoursite.tiny.garden</span>
      </div>
      <div className="relative h-[132px] overflow-hidden bg-white">
        <div className="landing-hero-scroll-content">
          <div className="px-2 pb-1">{stripe}</div>
          <div className="px-2 pb-1" aria-hidden>
            {stripe}
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-linear-to-b from-white to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-white to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function LandingHeroAnimation() {
  return (
    <div className="mx-auto mt-10 w-full max-w-sm" aria-hidden>
      <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
        Channel → site
      </p>

      <div className="relative mx-auto h-[196px] max-w-[280px] motion-reduce:hidden">
        <div className="landing-hero-arena-layer absolute inset-0 overflow-hidden rounded-lg">
          <ArenaBlocks className="h-full" />
        </div>
        <div className="landing-hero-web-layer absolute inset-0 overflow-hidden rounded-lg">
          <WebpageScroll className="h-full" />
        </div>
      </div>

      <div className="hidden motion-reduce:flex items-start justify-center gap-4 px-2">
        <ArenaBlocks className="w-[140px] shrink-0" />
        <span className="self-center text-neutral-300">→</span>
        <WebpageScroll className="w-[140px] shrink-0" />
      </div>
    </div>
  );
}
