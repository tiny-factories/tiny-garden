"use client";

import { createContext, useContext } from "react";
import Link from "next/link";

const PRICING_WAITLIST_HASH = "/#pricing";

type Ctx = {
  isBetaFull: boolean;
};

const BetaLandingContext = createContext<Ctx | null>(null);

export function useBetaLanding(): Ctx | null {
  return useContext(BetaLandingContext);
}

export function BetaCtaLink({
  hrefWhenOpen,
  children,
  className,
}: {
  hrefWhenOpen: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useBetaLanding();
  if (ctx?.isBetaFull) {
    return (
      <Link href={PRICING_WAITLIST_HASH} className={className} scroll>
        {children}
      </Link>
    );
  }
  return (
    <Link href={hrefWhenOpen} className={className}>
      {children}
    </Link>
  );
}

const tryNowClass =
  "inline-flex items-center justify-center rounded font-normal bg-neutral-900 text-white hover:bg-neutral-800 transition-colors px-3 py-1.5 text-sm";

export function BetaTryNowButton() {
  const ctx = useBetaLanding();
  if (ctx?.isBetaFull) {
    return (
      <Link href={PRICING_WAITLIST_HASH} className={tryNowClass} scroll>
        Join waitlist
      </Link>
    );
  }
  return (
    <Link href="/login" className={tryNowClass}>
      Try now
    </Link>
  );
}

export function BetaLandingShell({
  children,
  isBetaFull,
}: {
  children: React.ReactNode;
  isBetaFull: boolean;
}) {
  return (
    <BetaLandingContext.Provider value={{ isBetaFull }}>
      {children}
    </BetaLandingContext.Provider>
  );
}
