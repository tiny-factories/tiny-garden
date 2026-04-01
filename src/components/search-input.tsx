import { type ComponentProps } from "react";

/** Shared text-field styling for toolbar and dashboard search fields */
export const searchInputClassName =
  "h-9 min-w-0 flex-1 w-full box-border text-sm px-3 border border-neutral-200 dark:border-neutral-700 rounded outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors";

export function SearchInput({
  className = "",
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      className={[searchInputClassName, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
