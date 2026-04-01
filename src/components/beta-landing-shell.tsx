"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import Link from "next/link";
import { ButtondownWaitlistForm } from "@/components/buttondown-waitlist-form";

const SESSION_KEY = "tinygarden_beta_waitlist_modal_once";

type Ctx = {
  isBetaFull: boolean;
  openWaitlist: () => void;
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
      <button type="button" onClick={ctx.openWaitlist} className={className}>
        {children}
      </button>
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
      <button type="button" onClick={ctx.openWaitlist} className={tryNowClass}>
        Join waitlist
      </button>
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openWaitlist = useCallback(() => {
    dialogRef.current?.showModal();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    if (!isBetaFull) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    dialogRef.current?.showModal();
  }, [isBetaFull]);

  return (
    <BetaLandingContext.Provider value={{ isBetaFull, openWaitlist }}>
      {children}
      {isBetaFull && (
        <dialog
          ref={dialogRef}
          className="backdrop:bg-black/40 rounded-lg border border-neutral-200 shadow-xl max-w-md w-[calc(100%-2rem)] p-0 open:flex open:flex-col bg-white"
        >
          <div className="p-6">
            <h2 className="text-lg font-medium">Beta is full</h2>
            <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
              All free beta spots are taken. Join the list and we&apos;ll notify you when we
              open more. Supporters can still get lifetime access anytime — log in and choose
              Become a supporter on your account.
            </p>
            <div className="mt-5">
              <ButtondownWaitlistForm idPrefix="modal-waitlist" />
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <Link
                href="/login"
                className="text-sm text-neutral-600 underline underline-offset-2"
              >
                Log in (supporters)
              </Link>
              <button
                type="button"
                onClick={close}
                className="text-sm text-neutral-400 hover:text-neutral-600"
              >
                Close
              </button>
            </div>
          </div>
        </dialog>
      )}
    </BetaLandingContext.Provider>
  );
}
