export function TemplateBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 shadow-sm ring-1 ring-neutral-200/90">
      {label}
    </span>
  );
}
