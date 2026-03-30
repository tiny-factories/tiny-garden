"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Nav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.isAdmin) setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  // Don't show nav on public pages
  if (pathname === "/" || pathname === "/login") return null;

  // Don't show nav on serve routes
  if (pathname.startsWith("/api/serve")) return null;

  return (
    <nav className="w-full px-4 py-4 flex items-center justify-between border-b border-neutral-100">
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
        {isAdmin && (
          <Link
            href="/admin"
            className={`text-sm transition-colors ${
              pathname.startsWith("/admin") ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            Admin
          </Link>
        )}
      </div>
    </nav>
  );
}
