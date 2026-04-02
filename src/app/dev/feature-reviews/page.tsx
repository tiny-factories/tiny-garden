import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FEATURE_REQUESTS_ARENA_URL,
  fetchFeatureRequestChannelAndBlocks,
} from "@/lib/feature-requests";

export const metadata: Metadata = {
  title: "Feature reviews (dev)",
  description: "Live snapshot of tiny.garden feature requests from Are.na (development only).",
};

export default async function DevFeatureReviewsPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  let error: string | null = null;
  let channelTitle = "";
  let channelUpdated = "";
  let blocks: Awaited<
    ReturnType<typeof fetchFeatureRequestChannelAndBlocks>
  >["blocks"] = [];

  try {
    const { channel, blocks: b } = await fetchFeatureRequestChannelAndBlocks({
      cache: "no-store",
    });
    channelTitle = channel.title;
    channelUpdated = channel.updated_at;
    blocks = b;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load Are.na channel";
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
        Development only
      </p>
      <h1 className="text-xl font-medium text-neutral-950 dark:text-neutral-50">
        Feature reviews
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3 leading-relaxed">
        Pulled from the public Are.na channel{" "}
        <a
          href={FEATURE_REQUESTS_ARENA_URL}
          className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
          target="_blank"
          rel="noopener noreferrer"
        >
          tiny-factories / tiny-garden-feature-requests
        </a>
        . Starting <span className="font-mono text-xs">npm run dev</span> runs{" "}
        <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
          sync:feature-reviews
        </code>{" "}
        first (via <span className="font-mono text-xs">predev</span>) so{" "}
        <span className="font-mono text-xs">docs/feature-reviews.md</span> stays current; you can also run{" "}
        <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
          npm run sync:feature-reviews
        </code>{" "}
        anytime and commit the doc.
      </p>

      {error ? (
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <>
          <p className="mt-6 text-xs text-neutral-400 dark:text-neutral-500">
            {channelTitle} · Are.na updated {channelUpdated} · {blocks.length} blocks
          </p>
          <ul className="mt-8 space-y-6">
            {blocks.map((b, i) => (
              <li
                key={b.id}
                className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <a
                    href={b.blockUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-neutral-900 dark:text-neutral-100 underline-offset-2 hover:underline"
                  >
                    {i + 1}. {b.title?.trim() || b.summary.split("\n")[0]?.slice(0, 100) || `Block ${b.id}`}
                  </a>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    {b.type} · {b.commentCount} comments
                  </span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 whitespace-pre-wrap leading-relaxed">
                  {b.summary}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-12 text-sm text-neutral-500 dark:text-neutral-400">
        <Link href="/" className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100">
          Home
        </Link>
      </p>
    </main>
  );
}
