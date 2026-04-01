import type { ReactNode } from "react";

type Variant = "default" | "accent";

const variantClass: Record<Variant, string> = {
  default: "border-neutral-200 bg-white",
  accent: "border-emerald-200/80 bg-emerald-50/25",
};

/**
 * Squared landing surface — matches marketing cards (no radius, no shadow).
 */
export function LandingCard({
  children,
  className = "",
  variant = "default",
  inert: inertProp,
}: {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  /** Marks non-interactive preview surfaces (e.g. pricing mocks). */
  inert?: boolean;
}) {
  return (
    <div
      inert={inertProp ? true : undefined}
      className={`border ${variantClass[variant]} p-5 sm:p-6 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
