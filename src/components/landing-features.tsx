import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Globe2,
  LayoutTemplate,
  RefreshCw,
  Unlock,
  Zap,
} from "lucide-react";
import { LandingCard } from "@/components/landing-card";

const FEATURE_ROWS: {
  title: string;
  desc: string;
  badge?: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Are.na-native",
    icon: Blocks,
    desc: "Your channel is your CMS. Add a block in Are.na, rebuild your site — images, text, links, embeds, and attachments all supported.",
  },
  {
    title: "Custom subdomains",
    badge: "[In Testing]",
    icon: Globe2,
    desc: "Every site gets its own subdomain at your-name.tiny.garden. Clean, memorable URLs.",
  },
  {
    title: "Static & fast",
    icon: Zap,
    desc: "Sites are pre-built HTML and CSS. No JavaScript, no loading spinners. Just content.",
  },
  {
    title: "Multiple templates",
    icon: LayoutTemplate,
    desc: "Blog for writing, portfolio for images, feed for quick updates. Pick the layout that fits.",
  },
  {
    title: "One-click rebuild",
    icon: RefreshCw,
    desc: "Updated your channel? Hit rebuild and your site is current in seconds.",
  },
  {
    title: "No lock-in",
    icon: Unlock,
    desc: "Your content stays in Are.na. If you leave, nothing is lost.",
  },
];

export function LandingFeatures() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100 dark:border-neutral-800">
      <h2 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-8">
        Features
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        {FEATURE_ROWS.map(({ title, desc, badge, icon: Icon }) => (
          <LandingCard key={title} variant="accent" borderless>
            <div className="flex gap-4">
              <span
                className="flex size-9 shrink-0 items-center justify-center text-emerald-700 dark:text-emerald-400"
                aria-hidden
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {title}
                  {badge ? (
                    <>
                      {" "}
                      <span className="font-normal text-neutral-400 dark:text-neutral-500">{badge}</span>
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                  {desc}
                </p>
              </div>
            </div>
          </LandingCard>
        ))}
      </div>
    </section>
  );
}
