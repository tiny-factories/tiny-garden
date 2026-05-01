"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PIXEL_POLLINATOR_SVG } from "@/lib/garden-icon";

/** Minimal site fields for the preview sidebar (settings + new site draft). */
export type SitePreviewColumnSite = {
  subdomain: string;
  channelTitle: string;
  lastBuiltAt: string | null;
};

/** Pixel bee — same 1×1 rects + crispEdges as procedural plant icons. */
function PollinatorBee({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: PIXEL_POLLINATOR_SVG }}
      aria-hidden
    />
  );
}

/** Square frame for procedural plant SVG (preview + settings). */
export function PlantIconFrame({
  svg,
  sizeClass = "w-16 h-16",
  className,
  decorative,
  growing,
  growCycleKey = 0,
  iconVersion = 0,
  sproutActive = false,
  showPollinator,
}: {
  svg: string | null;
  sizeClass?: string;
  className?: string;
  decorative?: boolean;
  growing?: boolean;
  growCycleKey?: number;
  iconVersion?: number;
  sproutActive?: boolean;
  showPollinator?: boolean;
}) {
  const extra = className ? ` ${className}` : "";
  const a11y = decorative ? ({ "aria-hidden": true } as const) : {};
  const growingCls = growing
    ? " border-emerald-300/90 shadow-[0_0_14px_rgba(16,185,129,0.22)]"
    : "";
  const plantMotionCls = [
    growing ? "plant-icon--growing" : "",
    sproutActive && !growing ? "plant-icon--sprout" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!svg) {
    return (
      <div
        className={`relative shrink-0 aspect-square ${sizeClass} overflow-visible border border-neutral-200 dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-900 animate-pulse${growing ? " border-emerald-200/80 dark:border-emerald-800/50" : ""}${extra}`}
        {...a11y}
      >
        {showPollinator && !growing && (
          <PollinatorBee className="absolute -top-0.5 -right-0.5 w-[34%] max-w-[20px] aspect-[7/6] max-h-[18px] animate-[bee-gentle_2.8s_ease-in-out_infinite]" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 aspect-square ${sizeClass} border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 flex items-center justify-center p-1 [&_svg]:block [&_svg]:size-full [&_svg]:max-h-full [&_svg]:max-w-full transition-[border-color,box-shadow] duration-300 overflow-visible${growingCls} ${plantMotionCls}${extra}`}
      {...a11y}
    >
      <div
        key={`plant-${growCycleKey}-${iconVersion}`}
        className="flex items-center justify-center size-full min-h-0 [&_svg]:block [&_svg]:size-full [&_svg]:max-h-full [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {showPollinator && !growing && (
        <span
          className="pointer-events-none absolute -top-1 -right-1 z-10 select-none"
          aria-hidden
        >
          <PollinatorBee className="w-[34%] max-w-[22px] min-w-[12px] aspect-[7/6] animate-[bee-gentle_2.8s_ease-in-out_infinite]" />
        </span>
      )}
    </div>
  );
}

export function SitePreviewColumn({
  site,
  iconSvg,
  iconLoading,
  previewUrl,
  onPreviewRefresh,
  showPollinator,
  iconGrowCycle,
  iconVersion,
  iconSproutPulse,
  columnClassName = "flex w-full min-w-0 flex-1 min-h-0 flex-col gap-3",
  dashboardPreview = false,
  /** When set, replaces the default helper line under the channel title in the top card. */
  previewCardDescription,
}: {
  site: SitePreviewColumnSite;
  iconSvg: string | null;
  iconLoading: boolean;
  previewUrl: string | null;
  onPreviewRefresh?: () => void;
  showPollinator: boolean;
  iconGrowCycle: number;
  iconVersion: number;
  iconSproutPulse: boolean;
  columnClassName?: string;
  dashboardPreview?: boolean;
  previewCardDescription?: string;
}) {
  const [previewFrameReady, setPreviewFrameReady] = useState(false);
  const [reloadSpinning, setReloadSpinning] = useState(false);

  useEffect(() => {
    setPreviewFrameReady(false);
  }, [previewUrl]);

  useEffect(() => {
    if (!reloadSpinning) return;
    const t = window.setTimeout(() => setReloadSpinning(false), 12_000);
    return () => window.clearTimeout(t);
  }, [reloadSpinning]);

  const helperLine =
    previewCardDescription ??
    (dashboardPreview
      ? "Sample channel content with your current theme and saved custom CSS. Rebuild to update the public site."
      : "Same square icon attached to this site in the preview page's social metadata.");

  return (
    <div className={columnClassName}>
      <div className="shrink-0 border border-neutral-200 rounded-lg p-3 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2 dark:text-neutral-500">
          {dashboardPreview ? "Site preview" : site.lastBuiltAt ? "Live site" : "Share preview"}
        </p>
        <div className="flex gap-3">
          <PlantIconFrame
            svg={iconSvg}
            sizeClass="w-14 h-14"
            growing={iconLoading}
            growCycleKey={iconGrowCycle}
            iconVersion={iconVersion}
            sproutActive={iconSproutPulse}
            showPollinator={showPollinator}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-neutral-400 truncate dark:text-neutral-500">
              {site.subdomain}.tiny.garden
            </p>
            <p className="text-sm font-medium text-neutral-800 truncate dark:text-neutral-200">
              {site.channelTitle}
            </p>
            <p className="text-xs text-neutral-500 mt-1 leading-snug dark:text-neutral-400">
              {helperLine}
            </p>
          </div>
        </div>
      </div>
      <div
        className={`flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-white transition-[border-color,box-shadow] duration-300 dark:bg-neutral-900 ${
          iconLoading
            ? "border-emerald-200/80 dark:border-emerald-800/50 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]"
            : "border-neutral-200 dark:border-neutral-700"
        }`}
      >
        <div
          className={`flex items-center gap-2 px-3 py-2 border-b transition-colors duration-300 ${
            iconLoading
              ? "border-emerald-100/90 dark:border-emerald-900/40 bg-linear-to-r from-emerald-50/90 via-neutral-50 to-emerald-50/70 dark:from-emerald-950/50 dark:via-neutral-900 dark:to-emerald-950/40"
              : "border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
          }`}
        >
          <div
            className="group/traffic flex items-center gap-1.5 shrink-0"
            aria-hidden
          >
            <div
              className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                iconLoading
                  ? "bg-emerald-400/70"
                  : "bg-neutral-300 dark:bg-neutral-600 group-hover/traffic:bg-[#ff5f57] dark:group-hover/traffic:bg-[#ff5f57]"
              }`}
            />
            <div
              className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                iconLoading
                  ? "bg-emerald-400/50"
                  : "bg-neutral-300 dark:bg-neutral-600 group-hover/traffic:bg-[#ffbd2e] dark:group-hover/traffic:bg-[#ffbd2e]"
              }`}
            />
            <div
              className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                iconLoading
                  ? "bg-emerald-300/60"
                  : "bg-neutral-300 dark:bg-neutral-600 group-hover/traffic:bg-[#28c840] dark:group-hover/traffic:bg-[#28c840]"
              }`}
            />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <PlantIconFrame
              svg={iconSvg}
              sizeClass="w-4 h-4"
              className="p-0.5! rounded-[3px] border-neutral-200/90 dark:border-neutral-600/90"
              decorative
              growing={iconLoading}
              growCycleKey={iconGrowCycle}
              iconVersion={iconVersion}
              sproutActive={iconSproutPulse}
            />
            <span
              className={`text-[10px] min-w-0 flex-1 truncate transition-colors duration-300 ${
                iconLoading ? "text-emerald-800/80 dark:text-emerald-200/80" : "text-neutral-400 dark:text-neutral-500"
              }`}
            >
              {site.subdomain}.tiny.garden
            </span>
            {iconLoading && (
              <span className="text-[10px] text-emerald-700/80 shrink-0 font-medium whitespace-nowrap">
                · growing…
              </span>
            )}
          </div>
          {previewUrl ? (
            <button
              type="button"
              onClick={() => {
                setReloadSpinning(true);
                onPreviewRefresh?.();
              }}
              className="shrink-0 rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200/80 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              aria-label="Reload site preview"
              aria-busy={reloadSpinning}
              title="Fetch latest preview"
            >
              <RefreshCw
                className={`size-3.5 ${reloadSpinning ? "animate-spin" : ""}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          ) : null}
        </div>
        {previewUrl ? (
          <div className="relative min-h-0 w-full min-w-0 flex-1">
            {!previewFrameReady && (
              <div
                className="pointer-events-none absolute inset-0 z-[1] min-h-[12rem] bg-linear-to-b from-neutral-100 via-neutral-100/95 to-neutral-200/85 animate-pulse dark:from-neutral-800 dark:via-neutral-800/95 dark:to-neutral-900/90"
                aria-hidden
              />
            )}
            <iframe
              key={previewUrl}
              src={previewUrl}
              onLoad={() => {
                setPreviewFrameReady(true);
                setReloadSpinning(false);
              }}
              className={`absolute inset-0 z-0 h-full w-full border-0 transition-[filter,opacity] duration-300 ${
                iconLoading ? "opacity-55 saturate-75" : "opacity-100"
              }`}
              title="Site preview"
            />
            {iconLoading && (
              <div
                className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-end gap-2 pb-10 px-4 bg-linear-to-t from-emerald-100/55 via-emerald-50/15 to-transparent animate-[plant-preview-mist_1.8s_ease-in-out_infinite]"
                aria-hidden
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px] font-medium text-emerald-900/75 tracking-tight">
                    Sprouting a new icon
                  </span>
                  <span className="text-[10px] text-emerald-800/55">
                    Favicon & preview will match when done
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[min(16rem,40vh)] flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-neutral-400 dark:text-neutral-500 md:min-h-0">
            <span>Select a template to preview</span>
            {dashboardPreview ? (
              <span className="text-xs text-neutral-400/90 dark:text-neutral-500">
                Saved theme and custom CSS load here; choose a template under Settings if this stays empty.
              </span>
            ) : !site.lastBuiltAt ? (
              <span className="text-xs text-neutral-400/90 dark:text-neutral-500">
                After your first build finishes, this frame shows your real site.
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
