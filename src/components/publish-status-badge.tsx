const sizeDefault = "text-xs px-1.5 py-0.5";
const sizeCompact = "text-[10px] px-1.5 py-0.5";

const publishedClass =
  "rounded border font-medium border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-800/45 dark:bg-emerald-950/55 dark:text-emerald-200";

const draftClass =
  "rounded border font-medium border-neutral-200/90 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/95 dark:text-neutral-400";

export function PublishStatusBadge({
  published,
  size = "default",
  labelFormat = "lower",
}: {
  published: boolean;
  size?: "default" | "compact";
  /** Dashboard recent table uses lowercase; admin sites list uses title case. */
  labelFormat?: "lower" | "title";
}) {
  const label = published
    ? labelFormat === "title"
      ? "Published"
      : "published"
    : labelFormat === "title"
      ? "Draft"
      : "draft";

  return (
    <span
      className={`${size === "default" ? sizeDefault : sizeCompact} ${
        published ? publishedClass : draftClass
      }`}
    >
      {label}
    </span>
  );
}
