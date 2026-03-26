"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-2xl font-medium tracking-tight">tiny.garden</h1>
        <p className="text-sm text-neutral-500">
          Log in with your Are.na account to get started.
        </p>
        {error && (
          <p className="text-sm text-red-500">
            Login failed. Please try again.
          </p>
        )}
        <a
          href="/api/auth/login"
          className="inline-block px-4 py-2 text-sm border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
        >
          Log in with Are.na
        </a>
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
