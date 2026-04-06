import { searchInputClassName } from "@/components/search-input";
import type { ViewMode } from "@/components/toolbar";

function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-12">
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-5 w-28 rounded bg-neutral-200/90 animate-pulse" />
          <div className="h-5 w-14 rounded-full bg-neutral-100 animate-pulse dark:bg-neutral-800" />
        </div>
        <div className="h-3 w-24 rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
      </div>
      <div className="h-9 w-23 rounded border border-neutral-200 bg-neutral-50 animate-pulse dark:border-neutral-700 dark:bg-neutral-900" />
    </div>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="mb-4 flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">
        <div
          className={`${searchInputClassName} bg-neutral-50 animate-pulse pointer-events-none border-neutral-200`}
        />
      </div>
      <div className="h-9 min-w-23 shrink-0 rounded-md border border-neutral-200 bg-neutral-100/80 animate-pulse dark:border-neutral-700" />
    </div>
  );
}

function ListBodySkeleton() {
  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden divide-y divide-neutral-100 bg-white dark:border-neutral-700 dark:divide-neutral-800 dark:bg-neutral-900">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="size-9 shrink-0 rounded border border-neutral-100 bg-neutral-50 animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-[40%] max-w-xs rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
            <div className="h-3 w-[55%] max-w-md rounded bg-neutral-50 animate-pulse dark:bg-neutral-900" />
          </div>
          <div className="h-5 w-14 shrink-0 rounded-full bg-neutral-100 animate-pulse dark:bg-neutral-800" />
          <div className="h-5 w-9 shrink-0 rounded-full bg-neutral-100 animate-pulse dark:bg-neutral-800" />
          <div className="h-8 w-18 shrink-0 rounded border border-neutral-100 bg-neutral-50 animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />
          <div className="h-8 w-14 shrink-0 rounded border border-neutral-100 bg-neutral-50 animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />
        </div>
      ))}
    </div>
  );
}

function CardBodySkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-neutral-200 rounded-lg overflow-hidden bg-white dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="relative aspect-video bg-linear-to-br from-neutral-100 via-neutral-50 to-neutral-100 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2.5 min-w-0 flex-1">
                <div className="mt-0.5 size-9 shrink-0 rounded border border-neutral-100 bg-neutral-50 animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="h-4 w-full max-w-56 rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
                  <div className="h-3 w-36 rounded bg-neutral-50 animate-pulse dark:bg-neutral-900" />
                </div>
              </div>
              <div className="h-5 w-9 shrink-0 rounded-full bg-neutral-100 animate-pulse dark:bg-neutral-800" />
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <div className="h-8 w-16 rounded border border-neutral-100 bg-neutral-50 animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />
              <div className="h-8 w-14 rounded border border-neutral-100 bg-neutral-50 animate-pulse ml-auto dark:border-neutral-800 dark:bg-neutral-900" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export function SitesPageSkeleton({ viewMode }: { viewMode: ViewMode }) {
  return (
    <main className="min-h-screen w-full min-w-0 max-w-4xl mx-auto px-4 py-16" aria-busy="true" aria-label="Loading sites">
      <HeaderSkeleton />
      <ToolbarSkeleton />
      {viewMode === "list" ? (
        <ListBodySkeleton />
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:[&>*:nth-last-child(1):nth-child(odd)]:col-span-2"
              : "space-y-3"
          }
        >
          <CardBodySkeleton count={viewMode === "grid" ? 4 : 3} />
        </div>
      )}
    </main>
  );
}

export function SiteSettingsSkeleton() {
  return (
    <main
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="Loading site settings"
    >
      <div className="mb-6 shrink-0 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-2 pb-2">
            <div className="h-3 w-24 rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
            <div className="h-5 w-48 max-w-[80%] rounded bg-neutral-200/90 animate-pulse" />
            <div className="h-3 w-64 max-w-full rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
          </div>
          <div
            className="h-9 w-full max-w-[13.5rem] shrink-0 rounded-md border border-neutral-200 bg-neutral-100/80 sm:self-end dark:border-neutral-700 dark:bg-neutral-800/80"
            aria-hidden
          />
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 md:flex-row md:items-stretch md:gap-6">
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col max-md:min-h-[min(28rem,65vh)] md:min-h-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-3 rounded-lg border border-neutral-100 p-4 dark:border-neutral-800">
                <div className="h-3 w-14 rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
                <div className="flex gap-4">
                  <div className="size-14 shrink-0 rounded border border-neutral-200 bg-neutral-50 animate-pulse dark:border-neutral-700 dark:bg-neutral-900" />
                  <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                    <div className="h-3 w-full max-w-[14rem] rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
                    <div className="h-3 w-full max-w-[12rem] rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
                    <div className="h-7 w-24 rounded border border-neutral-200 bg-neutral-50 animate-pulse dark:border-neutral-700" />
                  </div>
                </div>
              </div>
              <div className="space-y-3 rounded-lg border border-neutral-100 p-4 dark:border-neutral-800">
                <div className="h-3 w-16 rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
                <div className="h-9 w-full rounded border border-neutral-100 bg-neutral-50 animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />
                <div className="h-9 w-full rounded border border-neutral-100 bg-neutral-50 animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />
              </div>
              <div className="space-y-3 rounded-lg border border-neutral-100 p-4 dark:border-neutral-800">
                <div className="h-3 w-12 rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
                <div className="h-10 w-full rounded border border-neutral-100 bg-neutral-50 animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />
                <div className="h-10 w-full rounded border border-neutral-100 bg-neutral-50 animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-28 rounded bg-neutral-200/90 animate-pulse" />
                <div className="h-9 w-16 rounded border border-neutral-100 bg-neutral-50 animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 max-md:min-h-[min(28rem,65vh)] md:min-h-0">
          {/* Mirrors SitePreviewColumn meta card */}
          <div className="shrink-0 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-2 h-2.5 w-24 rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
            <div className="flex gap-3">
              <div className="size-14 shrink-0 rounded border border-neutral-200 bg-neutral-50 animate-pulse dark:border-neutral-700 dark:bg-neutral-900" />
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <div className="h-2.5 w-full max-w-[12rem] rounded bg-neutral-100 animate-pulse dark:bg-neutral-800" />
                <div className="h-3.5 w-full max-w-[10rem] rounded bg-neutral-200/90 animate-pulse" />
                <div className="h-6 w-full max-w-full rounded bg-neutral-50 animate-pulse dark:bg-neutral-900" />
              </div>
            </div>
          </div>
          {/* Preview frame — full width of column, chrome matches loaded SitePreviewColumn */}
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex shrink-0 items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
              <div
                className="group/traffic flex shrink-0 items-center gap-1.5"
                aria-hidden
              >
                <div className="size-2 animate-pulse rounded-full bg-neutral-200 transition-colors duration-200 group-hover/traffic:animate-none group-hover/traffic:bg-[#ff5f57] dark:bg-neutral-600 dark:group-hover/traffic:bg-[#ff5f57]" />
                <div className="size-2 animate-pulse rounded-full bg-neutral-200 transition-colors duration-200 group-hover/traffic:animate-none group-hover/traffic:bg-[#ffbd2e] dark:bg-neutral-600 dark:group-hover/traffic:bg-[#ffbd2e]" />
                <div className="size-2 animate-pulse rounded-full bg-neutral-200 transition-colors duration-200 group-hover/traffic:animate-none group-hover/traffic:bg-[#28c840] dark:bg-neutral-600 dark:group-hover/traffic:bg-[#28c840]" />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <div className="size-4 shrink-0 rounded border border-neutral-200/90 bg-neutral-100 animate-pulse dark:border-neutral-600 dark:bg-neutral-800" />
                <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-neutral-400 tabular-nums animate-pulse dark:text-neutral-500">
                  channel-name.tiny.garden
                </span>
              </div>
              <div className="size-7 shrink-0 rounded-md bg-neutral-100 animate-pulse dark:bg-neutral-800" aria-hidden />
            </div>
            <div
              className="min-h-[min(14rem,40vh)] w-full min-w-0 flex-1 bg-linear-to-b from-neutral-50 to-neutral-100/80 animate-pulse dark:from-neutral-900 dark:to-neutral-950/90 md:min-h-0"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </main>
  );
}
