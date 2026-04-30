"use client";

const base =
  "rounded border font-medium transition-colors disabled:opacity-50 disabled:cursor-wait";

const sizeTable = "text-xs px-2 py-0.5";
const sizeCompact = "text-[10px] px-2 py-0.5";

const featuredOn =
  "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60";

const featuredOff =
  "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100";

export function FeaturedToggleButton({
  featured,
  disabled,
  onClick,
  size = "table",
}: {
  featured: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** Matches admin dashboard (`table`) vs admin sites list (`compact`). */
  size?: "table" | "compact";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${size === "table" ? sizeTable : sizeCompact} ${
        featured ? featuredOn : featuredOff
      }`}
    >
      {featured ? "Featured" : "Feature"}
    </button>
  );
}
