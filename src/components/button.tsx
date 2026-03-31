import Link from "next/link";
import type { ComponentProps } from "react";

const variantClasses = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-800 transition-colors",
  secondary:
    "border border-neutral-200 hover:bg-neutral-50 transition-colors text-neutral-900",
  ghost: "text-neutral-500 hover:text-neutral-900 transition-colors",
} as const;

const sizeClasses = {
  default: "px-4 py-2 text-sm",
  compact: "px-3 py-1.5 text-sm",
} as const;

export type ButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "default",
  className = "",
  ...props
}: ButtonProps) {
  const padding =
    variant === "ghost" ? "text-sm" : sizeClasses[size];
  return (
    <Link
      className={`inline-flex items-center justify-center rounded font-normal ${variantClasses[variant]} ${padding} ${className}`.trim()}
      {...props}
    />
  );
}
