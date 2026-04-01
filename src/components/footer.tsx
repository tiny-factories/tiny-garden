import Link from "next/link";
import { BUTTONDOWN_WAITLIST_TAG } from "@/lib/buttondown-waitlist";

export function Footer() {
  const pub = process.env.NEXT_PUBLIC_BUTTONDOWN_USER?.trim();
  const newsletterSlug = pub || "TinyFactories";
  const newsletterHref = `https://buttondown.com/${encodeURIComponent(newsletterSlug)}?tag=${encodeURIComponent(BUTTONDOWN_WAITLIST_TAG)}`;

  return (
    <footer className="w-full px-4 py-8 border-t border-neutral-100 dark:border-neutral-800">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
        <span className="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">tiny.garden</span>
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/docs"
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors shrink-0"
          >
            Docs
          </Link>
          <a
            href="https://changelog.tiny.garden"
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors shrink-0"
          >
            Changelog
          </a>
          <a
            href={newsletterHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors shrink-0"
          >
            Newsletter
          </a>
          <div className="flex items-center gap-3 shrink-0">
            {/* Are.na */}
            <a
              href="https://www.are.na/tiny-factories/channels"
              target="_blank"
              rel="noopener"
              className="text-neutral-300 hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
              aria-label="Are.na"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 3.6c4.636 0 8.4 3.764 8.4 8.4s-3.764 8.4-8.4 8.4S3.6 16.636 3.6 12 7.364 3.6 12 3.6zm0 3.6a4.8 4.8 0 100 9.6 4.8 4.8 0 000-9.6z" />
              </svg>
            </a>
            {/* GitHub */}
            <a
              href="https://github.com/tiny-factories/tiny-garden"
              target="_blank"
              rel="noopener"
              className="text-neutral-300 hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
              aria-label="GitHub"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            {/* X / Twitter */}
            <a
              href="https://x.com/gndclouds"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
              aria-label="X — @gndclouds"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* Bluesky */}
            <a
              href="https://bsky.app/profile/tinyfactories.bsky.social"
              target="_blank"
              rel="noopener"
              className="text-neutral-300 hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
              aria-label="Bluesky"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.601 3.497 6.21 3.252-4.34.64-8.14 2.2-3.28 7.7C8.754 26.3 11.18 21.28 12 19.285c.82 1.996 2.634 6.757 8.445 1.914 4.86-5.5 1.06-7.06-3.28-7.7 2.61.245 5.426-.625 6.21-3.252.247-.829.625-5.79.625-6.479 0-.688-.139-1.86-.902-2.203-.66-.3-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
