import { searchInputClassName } from "@/components/search-input";
import type { ViewMode } from "@/components/toolbar";

function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-12">
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-5 w-28 rounded bg-neutral-200/90 animate-pulse" />
          <div className="h-5 w-14 rounded-full bg-neutral-100 animate-pulse" />
        </div>
        <div className="h-3 w-24 rounded bg-neutral-100 animate-pulse" />
      </div>
      <div className="h-9 w-23 rounded border border-neutral-200 bg-neutral-50 animate-pulse" />
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
      <div className="h-9 min-w-23 shrink-0 rounded-md border border-neutral-200 bg-neutral-100/80 animate-pulse" />
    </div>
  );
}

function ListBodySkeleton() {
  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden divide-y divide-neutral-100 bg-white">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="size-9 shrink-0 rounded border border-neutral-100 bg-neutral-50 animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-[40%] max-w-xs rounded bg-neutral-100 animate-pulse" />
            <div className="h-3 w-[55%] max-w-md rounded bg-neutral-50 animate-pulse" />
          </div>
          <div className="h-5 w-14 shrink-0 rounded-full bg-neutral-100 animate-pulse" />
          <div className="h-5 w-9 shrink-0 rounded-full bg-neutral-100 animate-pulse" />
          <div className="h-8 w-18 shrink-0 rounded border border-neutral-100 bg-neutral-50 animate-pulse" />
          <div className="h-8 w-14 shrink-0 rounded border border-neutral-100 bg-neutral-50 animate-pulse" />
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
          className="border border-neutral-200 rounded-lg overflow-hidden bg-white"
        >
          <div className="relative aspect-video bg-linear-to-br from-neutral-100 via-neutral-50 to-neutral-100 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2.5 min-w-0 flex-1">
                <div className="mt-0.5 size-9 shrink-0 rounded border border-neutral-100 bg-neutral-50 animate-pulse" />
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="h-4 w-full max-w-56 rounded bg-neutral-100 animate-pulse" />
                  <div className="h-3 w-36 rounded bg-neutral-50 animate-pulse" />
                </div>
              </div>
              <div className="h-5 w-9 shrink-0 rounded-full bg-neutral-100 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
              <div className="h-8 w-16 rounded border border-neutral-100 bg-neutral-50 animate-pulse" />
              <div className="h-8 w-14 rounded border border-neutral-100 bg-neutral-50 animate-pulse ml-auto" />
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
    <main className="max-w-7xl mx-auto px-4 py-8" aria-busy="true" aria-label="Loading site settings">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-neutral-100 animate-pulse" />
          <div className="h-5 w-48 max-w-[80%] rounded bg-neutral-200/90 animate-pulse" />
          <div className="h-3 w-64 max-w-full rounded bg-neutral-100 animate-pulse" />
        </div>
      </div>

      <div className="flex gap-6 items-start">
        <div className="w-80 shrink-0 space-y-4">
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-[8.25rem] shrink-0 rounded-md border border-neutral-200 bg-neutral-100/80 animate-pulse" />
            </div>
            <div className="h-9 w-full rounded border border-neutral-200 bg-neutral-50 animate-pulse" />
          </div>
          <div className="p-4 border border-neutral-100 rounded-lg space-y-3">
            <div className="h-3 w-16 rounded bg-neutral-100 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-12 rounded bg-neutral-50 animate-pulse" />
                  <div className="h-9 w-full rounded border border-neutral-100 bg-neutral-50 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border border-neutral-100 rounded-lg space-y-3">
            <div className="h-3 w-12 rounded bg-neutral-100 animate-pulse" />
            <div className="h-10 w-full rounded border border-neutral-100 bg-neutral-50 animate-pulse" />
            <div className="h-10 w-full rounded border border-neutral-100 bg-neutral-50 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded bg-neutral-200/90 animate-pulse" />
            <div className="h-9 w-16 rounded border border-neutral-100 bg-neutral-50 animate-pulse" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white sticky top-8">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-100 bg-neutral-50">
              <div className="w-2 h-2 rounded-full bg-neutral-200 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-neutral-200 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-neutral-200 animate-pulse" />
              <div className="h-2.5 flex-1 max-w-48 ml-2 rounded bg-neutral-100 animate-pulse" />
            </div>
            <div
              className="w-full bg-linear-to-b from-neutral-50 to-neutral-100/80 animate-pulse"
              style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
