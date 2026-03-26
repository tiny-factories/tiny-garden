"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();

  // Don't show nav on public pages
  if (pathname === "/" || pathname === "/login") return null;

  // Don't show nav on serve routes
  if (pathname.startsWith("/api/serve")) return null;

  return (
    <nav className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between border-b border-neutral-100 mb-8">
      <Link href="/sites" className="text-sm font-medium">
        tiny.garden
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/sites"
          className={`text-sm transition-colors ${
            pathname.startsWith("/site") ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Sites
        </Link>
        <Link
          href="/about"
          className={`text-sm transition-colors ${
            pathname === "/about" ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          About
        </Link>
        <Link
          href="/account"
          className={`text-sm transition-colors ${
            pathname === "/account" ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Account
        </Link>
      </div>
    </nav>
  );
}
