const FEATURE_ROWS: { title: string; desc: string; badge?: string }[] = [
  {
    title: "Are.na-native",
    desc: "Your channel is your CMS. Add a block in Are.na, rebuild your site — images, text, links, embeds, and attachments all supported.",
  },
  {
    title: "Custom subdomains",
    badge: "[In Testing]",
    desc: "Every site gets its own subdomain at your-name.tiny.garden. Clean, memorable URLs.",
  },
  {
    title: "Static & fast",
    desc: "Sites are pre-built HTML and CSS. No JavaScript, no loading spinners. Just content.",
  },
  {
    title: "Multiple templates",
    desc: "Blog for writing, portfolio for images, feed for quick updates. Pick the layout that fits.",
  },
  {
    title: "One-click rebuild",
    desc: "Updated your channel? Hit rebuild and your site is current in seconds.",
  },
  {
    title: "No lock-in",
    desc: "Your content stays in Are.na. If you leave, nothing is lost.",
  },
];

export function LandingFeatures() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100 dark:border-neutral-800">
      <h2 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-8">
        Features
      </h2>
      <div className="grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2">
        {FEATURE_ROWS.map(({ title, desc, badge }) => (
          <div key={title}>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {title}
              {badge ? (
                <>
                  {" "}
                  <span className="font-normal text-neutral-400 dark:text-neutral-500">{badge}</span>
                </>
              ) : null}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
