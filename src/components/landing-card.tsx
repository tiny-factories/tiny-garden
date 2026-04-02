import type { ReactNode } from "react";

type Variant = "default" | "accent";

const variantBorder: Record<Variant, string> = {
  default: "border-neutral-200 dark:border-neutral-700",
  accent: "border-emerald-200/80 dark:border-emerald-800/50",
};

const variantBg: Record<Variant, string> = {
  default: "bg-white dark:bg-neutral-900",
  accent: "bg-emerald-50/25 dark:bg-emerald-950/30",
};

/**
 * Squared landing surface — matches marketing cards (no radius, no shadow).
 */
export function LandingCard({
  children,
  className = "",
  variant = "default",
  borderless = false,
  inert: inertProp,
}: {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  /** Same fill as bordered cards, without a stroke (e.g. feature tiles). */
  borderless?: boolean;
  /** Marks non-interactive preview surfaces (e.g. pricing mocks). */
  inert?: boolean;
}) {
  const surface = borderless
    ? variantBg[variant]
    : `border ${variantBorder[variant]} ${variantBg[variant]}`;

  return (
    <div
      inert={inertProp ? true : undefined}
      className={`${surface} p-5 sm:p-6 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
