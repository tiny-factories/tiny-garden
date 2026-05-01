import Link from "next/link";
import type { ComponentProps } from "react";

const variantClasses = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors",
  secondary:
    "border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors text-neutral-900 dark:text-neutral-100",
  ghost:
    "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors",
  danger:
    "border border-red-100 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-950/30",
  /** Inline destructive actions (e.g. row Delete); not full-width. */
  destructive:
    "text-red-500 border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-950/30",
} as const;

const sizeClasses = {
  default: "px-4 py-2 text-sm",
  compact: "px-3 py-1.5 text-sm",
  xs: "px-3 py-1.5 text-xs",
  /** Row actions (e.g. sites list Settings / destructive). */
  inline: "px-2.5 py-1 text-xs",
} as const;

type CommonButtonProps = {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  className?: string;
};

type ButtonLinkProps = CommonButtonProps &
  Omit<ComponentProps<typeof Link>, "className" | "href"> & { href: string };

type ButtonNativeProps = CommonButtonProps &
  Omit<ComponentProps<"button">, "className">;

export type ButtonProps = ButtonLinkProps | ButtonNativeProps;

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "default";
  const className = props.className ?? "";
  const layout =
    variant === "danger"
      ? "block w-full text-left"
      : "inline-flex items-center justify-center";
  const padding =
    variant === "ghost"
      ? "text-sm"
      : variant === "danger"
        ? "px-4 py-3 text-sm"
        : variant === "destructive"
          ? "px-2.5 py-1 text-xs"
          : sizeClasses[size];
  const classes =
    `${layout} rounded font-normal ${variantClasses[variant]} ${padding} ${className}`.trim();

  if ("href" in props && props.href) {
    const { variant: _v, size: _s, className: _c, ...linkProps } = props;
    return <Link className={classes} {...linkProps} />;
  }

  const { variant: _v, size: _s, className: _c, type, ...buttonProps } =
    props as ButtonNativeProps;
  return (
    <button type={type ?? "button"} className={classes} {...buttonProps} />
  );
}
