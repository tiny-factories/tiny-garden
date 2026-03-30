"use client";

export type ViewMode = "single" | "grid" | "list";

interface ToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  children?: React.ReactNode;
}

export function Toolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  viewMode,
  onViewModeChange,
  children,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {onSearchChange !== undefined && (
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={search || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full text-sm px-3 py-1.5 border border-neutral-200 rounded outline-none focus:border-neutral-400 transition-colors"
          />
        </div>
      )}
      {children}
      {onViewModeChange && viewMode && (
        <div className="flex border border-neutral-200 rounded overflow-hidden shrink-0">
          <button
            onClick={() => onViewModeChange("single")}
            className={`p-1.5 transition-colors ${
              viewMode === "single" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-50"
            }`}
            title="Single column"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="12" height="12" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            className={`p-1.5 border-l border-r border-neutral-200 transition-colors ${
              viewMode === "grid" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-50"
            }`}
            title="Grid"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="5" height="5" rx="0.5" />
              <rect x="9" y="2" width="5" height="5" rx="0.5" />
              <rect x="2" y="9" width="5" height="5" rx="0.5" />
              <rect x="9" y="9" width="5" height="5" rx="0.5" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`p-1.5 transition-colors ${
              viewMode === "list" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-50"
            }`}
            title="List"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="2" y1="8" x2="14" y2="8" />
              <line x1="2" y1="12" x2="14" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
