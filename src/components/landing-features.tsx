import {
  LandingFeatureIcon,
  type LandingFeatureIconKind,
} from "@/components/landing-feature-icons";
import { LandingCard } from "@/components/landing-card";

const FEATURE_ROWS: {
  title: string;
  desc: string;
  badge?: string;
  icon: LandingFeatureIconKind;
}[] = [
  {
    title: "Are.na-native",
    icon: "blocks",
    desc: "Your channel is your CMS. Add a block in Are.na, rebuild your site — images, text, links, embeds, and attachments all supported.",
  },
  {
    title: "Custom subdomains",
    badge: "[In Testing]",
    icon: "subdomain",
    desc: "Every site gets its own subdomain at your-name.tiny.garden. Clean, memorable URLs.",
  },
  {
    title: "Static & fast",
    icon: "zap",
    desc: "Sites are pre-built HTML and CSS. No JavaScript, no loading spinners. Just content.",
  },
  {
    title: "Multiple templates",
    icon: "templates",
    desc: "Blog for writing, portfolio for images, feed for quick updates. Pick the layout that fits.",
  },
  {
    title: "Auto rebuild",
    icon: "calendar",
    desc: "On supported plans your site rebuilds on a schedule, so what’s live can stay in step with your channel—like flipping to a new day.",
  },
  {
    title: "No lock-in",
    icon: "lock",
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
        {FEATURE_ROWS.map(({ title, desc, badge, icon }) => (
          <LandingCard key={title} variant="accent" borderless className="group">
            <div className="flex gap-4">
              <LandingFeatureIcon kind={icon} />
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
