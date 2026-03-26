import Link from "next/link";

function TemplatePreview({
  name,
  slug,
  description,
  children,
}: {
  name: string;
  slug: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/api/templates/preview?template=${slug}`}
      target="_blank"
      className="border border-neutral-200 rounded overflow-hidden block group hover:border-neutral-400 transition-colors"
    >
      <div className="bg-neutral-50 border-b border-neutral-100 aspect-[4/3] overflow-hidden p-4">
        {children}
      </div>
      <div className="p-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
        </div>
        <span className="text-xs text-neutral-300 group-hover:text-neutral-500 transition-colors">
          Preview &rarr;
        </span>
      </div>
    </Link>
  );
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
        <span className="text-sm font-medium">tiny.garden</span>
        <Link
          href="/login"
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-24 pb-20 text-center">
        <h1 className="text-3xl font-medium tracking-tight">
          Turn any Are.na channel
          <br />
          into a website.
        </h1>
        <p className="text-sm text-neutral-500 mt-4 max-w-md mx-auto leading-relaxed">
          Pick a channel, choose a template, get a site. No code, no hosting
          setup. Your Are.na content, published in seconds.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
          >
            Get started free
          </Link>
          <a
            href="#templates"
            className="px-4 py-2 text-sm border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
          >
            See templates
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100">
        <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <p className="text-sm font-medium">1. Connect your channel</p>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Log in with Are.na and pick any channel from your account.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">2. Choose a template</p>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Select a layout that fits your content — blog, portfolio, or feed.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">3. Publish</p>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Pick a subdomain and your site is live at
              your-name.tiny.garden.
            </p>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section
        id="templates"
        className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100"
      >
        <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-8">
          Templates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Blog preview */}
          <TemplatePreview
            name="Blog"
            slug="blog"
            description="Vertical stream of content blocks"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="font-medium text-sm mb-2">Channel Title</div>
              <div className="text-[10px] text-neutral-400 mb-4">
                A short description of the channel
              </div>
              <div className="space-y-3">
                <div className="bg-neutral-200 rounded h-20 w-full" />
                <div className="space-y-1">
                  <div className="bg-neutral-200 rounded h-2 w-full" />
                  <div className="bg-neutral-200 rounded h-2 w-4/5" />
                  <div className="bg-neutral-200 rounded h-2 w-3/5" />
                </div>
                <div className="bg-neutral-200 rounded h-16 w-full" />
                <div className="space-y-1">
                  <div className="bg-neutral-200 rounded h-2 w-full" />
                  <div className="bg-neutral-200 rounded h-2 w-2/3" />
                </div>
              </div>
            </div>
          </TemplatePreview>

          {/* Feed preview */}
          <TemplatePreview
            name="Feed"
            slug="feed"
            description="Responsive grid of blocks"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="font-medium text-sm mb-3">Channel Title</div>
              <div className="grid grid-cols-3 gap-1">
                <div className="bg-neutral-200 rounded aspect-square" />
                <div className="bg-neutral-300 rounded aspect-square" />
                <div className="bg-neutral-200 rounded aspect-square" />
                <div className="bg-neutral-200 rounded aspect-square" />
                <div className="bg-neutral-200 rounded aspect-square" />
                <div className="bg-neutral-300 rounded aspect-square" />
              </div>
            </div>
          </TemplatePreview>

          {/* Portfolio preview */}
          <TemplatePreview
            name="Portfolio"
            slug="portfolio"
            description="Full-width image showcase"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="font-medium text-sm mb-3">Channel Title</div>
              <div className="space-y-3">
                <div className="bg-neutral-200 rounded h-24 w-full" />
                <div className="space-y-1">
                  <div className="bg-neutral-200 rounded h-2 w-2/3" />
                  <div className="bg-neutral-200 rounded h-2 w-1/2" />
                </div>
                <div className="bg-neutral-200 rounded h-20 w-full" />
              </div>
            </div>
          </TemplatePreview>

          {/* Slideshow preview */}
          <TemplatePreview
            name="Slideshow"
            slug="slideshow"
            description="Full-screen slides with keyboard nav"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="bg-neutral-800 rounded p-3 aspect-[4/3] flex items-center justify-center relative">
                <div className="bg-neutral-600 rounded w-3/4 h-3/4" />
                <div className="absolute bottom-2 left-3 text-[8px] text-neutral-500">1 / 8</div>
                <div className="absolute left-1 top-1/2 text-neutral-600 text-[10px]">&larr;</div>
                <div className="absolute right-1 top-1/2 text-neutral-600 text-[10px]">&rarr;</div>
              </div>
            </div>
          </TemplatePreview>

          {/* Blank preview */}
          <TemplatePreview
            name="Blank"
            slug="blank"
            description="Minimal starting point for custom CSS"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="space-y-3 pt-2">
                <div className="bg-neutral-200 rounded h-16 w-full" />
                <div className="space-y-1">
                  <div className="bg-neutral-100 rounded h-2 w-full" />
                  <div className="bg-neutral-100 rounded h-2 w-3/4" />
                </div>
                <div className="bg-neutral-200 rounded h-12 w-full" />
              </div>
            </div>
          </TemplatePreview>

          {/* Campaign preview */}
          <TemplatePreview
            name="Campaign"
            slug="campaign"
            description="Full-screen landing page"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="bg-neutral-800 rounded aspect-[4/3] flex items-center justify-center relative">
                <div className="text-center">
                  <div className="bg-neutral-600 rounded h-3 w-32 mx-auto mb-2" />
                  <div className="bg-neutral-700 rounded h-2 w-40 mx-auto mb-3" />
                  <div className="bg-neutral-500 rounded h-2 w-20 mx-auto" />
                </div>
              </div>
            </div>
          </TemplatePreview>

          {/* Document preview */}
          <TemplatePreview
            name="Document"
            slug="document"
            description="Sidebar nav, doc-style layout"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="flex gap-2">
                <div className="w-1/4 space-y-2 pt-1">
                  <div className="bg-neutral-300 rounded h-2 w-full" />
                  <div className="bg-neutral-200 rounded h-1.5 w-3/4" />
                  <div className="bg-neutral-200 rounded h-1.5 w-2/3" />
                </div>
                <div className="w-3/4 space-y-2">
                  <div className="bg-neutral-200 rounded h-3 w-1/2" />
                  <div className="bg-neutral-100 rounded h-2 w-full" />
                  <div className="bg-neutral-100 rounded h-2 w-full" />
                  <div className="bg-neutral-100 rounded h-2 w-4/5" />
                  <div className="bg-neutral-200 rounded h-16 w-full" />
                  <div className="bg-neutral-100 rounded h-2 w-full" />
                  <div className="bg-neutral-100 rounded h-2 w-3/5" />
                </div>
              </div>
            </div>
          </TemplatePreview>

          {/* Homepage preview */}
          <TemplatePreview
            name="Homepage"
            slug="homepage"
            description="Full-screen hero with links"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="bg-neutral-700 rounded aspect-[4/3] flex items-center justify-center">
                <div className="text-center">
                  <div className="bg-neutral-500 rounded h-4 w-36 mx-auto mb-2" />
                  <div className="bg-neutral-600 rounded h-2 w-44 mx-auto mb-3" />
                  <div className="flex gap-1 justify-center">
                    <div className="bg-neutral-500 rounded-full h-2 w-12" />
                    <div className="bg-neutral-500 rounded-full h-2 w-12" />
                    <div className="bg-neutral-500 rounded-full h-2 w-12" />
                  </div>
                </div>
              </div>
            </div>
          </TemplatePreview>

          {/* Presentation preview */}
          <TemplatePreview
            name="Presentation"
            slug="presentation"
            description="Keynote-style full-screen slides"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="bg-neutral-100 rounded aspect-[4/3] flex items-center justify-center relative border border-neutral-200">
                <div className="text-center">
                  <div className="bg-neutral-300 rounded h-3 w-28 mx-auto mb-2" />
                  <div className="bg-neutral-200 rounded h-2 w-36 mx-auto" />
                </div>
                <div className="absolute bottom-1 w-full px-3">
                  <div className="bg-neutral-200 rounded-full h-0.5 w-full" />
                </div>
              </div>
            </div>
          </TemplatePreview>

          {/* Shop preview */}
          <TemplatePreview
            name="Shop"
            slug="ecommerce"
            description="Product showcase with gallery"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="flex gap-2">
                <div className="w-1/2 space-y-2 pt-1">
                  <div className="bg-neutral-200 rounded h-3 w-2/3" />
                  <div className="bg-neutral-100 rounded h-2 w-full" />
                  <div className="bg-neutral-100 rounded h-2 w-4/5" />
                  <div className="bg-neutral-800 rounded h-6 w-24 mt-2" />
                </div>
                <div className="w-1/2">
                  <div className="bg-neutral-200 rounded aspect-square" />
                </div>
              </div>
            </div>
          </TemplatePreview>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/templates"
            className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors underline underline-offset-2"
          >
            View all templates with live previews
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100">
        <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-8">
          Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
          <FeatureItem
            title="Are.na-native"
            desc="Your channel is your CMS. Add a block in Are.na, rebuild your site — images, text, links, embeds, and attachments all supported."
          />
          <FeatureItem
            title="Custom subdomains"
            desc="Every site gets its own subdomain at your-name.tiny.garden. Clean, memorable URLs."
          />
          <FeatureItem
            title="Static & fast"
            desc="Sites are pre-built HTML and CSS. No JavaScript, no loading spinners. Just content."
          />
          <FeatureItem
            title="Multiple templates"
            desc="Blog for writing, portfolio for images, feed for quick updates. Pick the layout that fits."
          />
          <FeatureItem
            title="One-click rebuild"
            desc="Updated your channel? Hit rebuild and your site is current in seconds."
          />
          <FeatureItem
            title="No lock-in"
            desc="Your content stays in Are.na. If you leave, nothing is lost."
          />
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100"
      >
        <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-8">
          Pricing
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-neutral-200 rounded p-5">
            <p className="text-sm font-medium">Free</p>
            <p className="text-2xl font-medium mt-2">$0</p>
            <p className="text-xs text-neutral-400 mt-1">forever</p>
            <ul className="mt-4 space-y-2 text-xs text-neutral-500">
              <li>1 site</li>
              <li>Basic templates</li>
              <li>Custom subdomain</li>
              <li>Manual rebuilds</li>
            </ul>
          </div>
          <div className="border border-neutral-900 rounded p-5">
            <p className="text-sm font-medium">Pro</p>
            <p className="text-2xl font-medium mt-2">
              $8<span className="text-sm text-neutral-400 font-normal">/mo</span>
            </p>
            <p className="text-xs text-neutral-400 mt-1">or $72/yr</p>
            <ul className="mt-4 space-y-2 text-xs text-neutral-500">
              <li>5 sites</li>
              <li>All templates</li>
              <li>Custom CSS</li>
              <li>Custom domain</li>
              <li>Auto-sync rebuilds</li>
            </ul>
          </div>
          <div className="border border-neutral-200 rounded p-5">
            <p className="text-sm font-medium">Studio</p>
            <p className="text-2xl font-medium mt-2">
              $20<span className="text-sm text-neutral-400 font-normal">/mo</span>
            </p>
            <p className="text-xs text-neutral-400 mt-1">or $180/yr</p>
            <ul className="mt-4 space-y-2 text-xs text-neutral-500">
              <li>Unlimited sites</li>
              <li>All templates + early access</li>
              <li>Custom CSS</li>
              <li>Custom domain</li>
              <li>Auto-sync + webhooks</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100">
        <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-8">
          Featured sites
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: "Field Notes",
              desc: "Research and observations",
              subdomain: "field-notes",
            },
            {
              title: "Visual References",
              desc: "Collected imagery and inspiration",
              subdomain: "visual-refs",
            },
            {
              title: "Reading List",
              desc: "Articles, essays, and books",
              subdomain: "reading-list",
            },
            {
              title: "Studio Archive",
              desc: "Work in progress and documentation",
              subdomain: "studio-archive",
            },
          ].map((site) => (
            <div
              key={site.subdomain}
              className="border border-neutral-200 rounded overflow-hidden group"
            >
              <div className="bg-neutral-50 aspect-[16/10] flex items-center justify-center">
                <span className="text-xs text-neutral-300">
                  {site.subdomain}.tiny.garden
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium">{site.title}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{site.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-20 border-t border-neutral-100 text-center">
        <p className="text-lg font-medium">
          Your Are.na channel is already a website.
        </p>
        <p className="text-sm text-neutral-400 mt-2">
          You just haven&apos;t published it yet.
        </p>
        <Link
          href="/login"
          className="inline-block mt-6 px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
        >
          Get started free
        </Link>
      </section>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 py-8 border-t border-neutral-100 flex items-center justify-between">
        <span className="text-xs text-neutral-400">tiny.garden</span>
        <div className="flex gap-4">
          <a
            href="https://are.na"
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Are.na
          </a>
          <a
            href="#pricing"
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Pricing
          </a>
          <Link
            href="/login"
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Log in
          </Link>
        </div>
      </footer>
    </main>
  );
}
