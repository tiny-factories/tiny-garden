"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Nav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => {
        if (r.ok) {
          setIsLoggedIn(true);
          return r.json();
        }
        setIsLoggedIn(false);
        return null;
      })
      .then((data) => {
        if (data?.isAdmin) setIsAdmin(true);
      })
      .catch(() => {
        setIsLoggedIn(false);
      });
  }, []);

  // Don't show nav on login (full-bleed flow)
  if (pathname === "/login") return null;

  // Don't show nav on serve routes
  if (pathname.startsWith("/api/serve")) return null;

  return (
    <nav className="w-full px-4 py-4 flex items-center justify-between border-b border-neutral-100">
      <Link href="/sites" className="text-sm font-medium">
        tiny.garden
      </Link>
      <div className="flex items-center gap-4">
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
        <Link
          href="/sites"
          className={`text-sm transition-colors ${
            pathname.startsWith("/site") ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Sites
        </Link>
        {!isLoggedIn && (
          <Link
            href="/about"
            className={`text-sm transition-colors ${
              pathname === "/about" ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            About
          </Link>
        )}
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
