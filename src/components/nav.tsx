"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { generatePlantDataURI, seedFromSubdomain } from "@/lib/garden-icon";

const NAV_BRAND_PLANT_SRC = generatePlantDataURI(seedFromSubdomain("tiny.garden"));

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
    <nav className="flex w-full items-center justify-between gap-2 px-4 py-4 border-b border-neutral-100 dark:border-neutral-800">
      <div className="flex min-w-0 justify-start">
        <Link
          href={isLoggedIn ? "/sites" : "/"}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100"
        >
          <Image
            src={NAV_BRAND_PLANT_SRC}
            alt=""
            width={20}
            height={20}
            unoptimized
            className="size-5 shrink-0 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 object-contain pointer-events-none select-none [image-rendering:crisp-edges]"
            aria-hidden
          />
          tiny.garden
        </Link>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-4">
        {isAdmin && (
          <Link
            href="/admin"
            className={`text-sm transition-colors ${
              pathname.startsWith("/admin")
                ? "text-neutral-900 dark:text-neutral-100"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
          >
            Admin
          </Link>
        )}
        {isLoggedIn ? (
          <>
            <Link
              href="/sites"
              className={`text-sm transition-colors ${
                pathname.startsWith("/site")
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              }`}
            >
              Sites
            </Link>
            <Link
              href="/account"
              className={`text-sm transition-colors ${
                pathname === "/account"
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              }`}
            >
              Account
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/cli"
              className={`text-sm transition-colors ${
                pathname === "/cli"
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              }`}
            >
              CLI
            </Link>
            <Link
              href="/about"
              className={`text-sm transition-colors ${
                pathname === "/about"
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              }`}
            >
              About
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors px-3 py-1.5 text-sm"
            >
              Try it now
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
