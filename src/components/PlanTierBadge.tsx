import type { LucideIcon } from "lucide-react";
import { Award, Layers } from "lucide-react";

type PaidPlan = "pro" | "studio";

const TIER_BADGES: Record<
  PaidPlan,
  { label: string; Icon: LucideIcon; className: string }
> = {
  pro: {
    label: "Supporter",
    Icon: Award,
    className:
      "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200",
  },
  studio: {
    label: "Studio",
    Icon: Layers,
    className:
      "border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200",
  },
};

/** Pill next to headings; extend `TIER_BADGES` when new paid tiers ship. */
export function PlanTierBadge({ plan }: { plan: string }) {
  if (plan !== "pro" && plan !== "studio") return null;
  const { label, Icon, className } = TIER_BADGES[plan];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${className}`}
      title={`${label} plan`}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
      {label}
    </span>
  );
}
