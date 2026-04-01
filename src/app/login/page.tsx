"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { track } from "@/lib/track";

function LoginContent() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-950 dark:text-neutral-50">tiny.garden</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Log in with your Are.na account to get started.
        </p>
        {error && (
          <p className="text-sm text-red-500">
            Login failed. Please try again.
          </p>
        )}
        <a
          href="/api/auth/login"
          onClick={() => track("oauth-started")}
          className="inline-block px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
        >
          Log in with Are.na
        </a>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 pt-2">
          New to Are.na?{" "}
          <a
            href="https://www.are.na/sign_up"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-700 dark:text-neutral-300 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Create an account
          </a>
          {" · "}
          <a
            href="https://are.na"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-700 dark:text-neutral-300 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            About Are.na
          </a>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
