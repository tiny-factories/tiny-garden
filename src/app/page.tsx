import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BetaCtaLink, BetaLandingShell } from "@/components/beta-landing-shell";
import { LandingFeatures } from "@/components/landing-features";
import {
  HowItWorksConnectIllustration,
  HowItWorksPublishIllustration,
  HowItWorksTemplateIllustration,
  LandingHeroAnimation,
} from "@/components/landing-hero-animation";
import { PayWhatYouCanPricing } from "@/components/pay-what-you-can-pricing";
import { TemplateTicker } from "@/components/template-ticker";
import { prisma } from "@/lib/db";
import { BETA_SPOTS, getBetaSpotsRemaining, isBetaFull } from "@/lib/beta";
import { getTemplateDisplayNames } from "@/lib/template-display-names";
import { FeaturedSitesGallery } from "@/components/featured-sites-gallery";

interface FeaturedSite {
  id: string;
  subdomain: string;
  channelTitle: string;
  template: string;
  arenaUsername: string;
}

async function getFeaturedSites(): Promise<FeaturedSite[]> {
  try {
    const sites = await prisma.site.findMany({
      where: { featured: true, published: true },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { arenaUsername: true } } },
    });
    return sites.map((s) => ({
      id: s.id,
      subdomain: s.subdomain,
      channelTitle: s.channelTitle,
      template: s.template,
      arenaUsername: s.user.arenaUsername,
    }));
  } catch {
    return [];
  }
}

function TemplatePreview({
  name,
  slug,
  children,
}: {
  name: string;
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/api/templates/preview?template=${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${name} — open template preview in a new tab`}
      className="border border-neutral-200 dark:border-neutral-700 overflow-hidden block group hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
    >
      <div className="relative bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 aspect-[4/3] overflow-hidden p-5 sm:p-6">
        <span
          className="absolute top-3 right-3 z-10 inline-flex bg-white/95 dark:bg-neutral-950/95 p-1.5 text-neutral-700 dark:text-neutral-300 opacity-0 ring-1 ring-neutral-200/80 dark:ring-neutral-700/80 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none"
          aria-hidden
        >
          <ArrowUpRight className="size-3.5 sm:size-4 shrink-0" strokeWidth={2} />
        </span>
        {children}
      </div>
      <div className="px-5 py-4 sm:px-6 sm:py-5 bg-white dark:bg-neutral-950">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</p>
      </div>
    </Link>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Flip to true to show the Are.na → site diagram under the hero headline. */
const SHOW_LANDING_HERO_ANIMATION = false;

export default async function Home() {
  const [featuredSites, templateNames] = await Promise.all([
    getFeaturedSites(),
    getTemplateDisplayNames(),
  ]);
  const betaFull = await isBetaFull();
  const spotsRemaining = await getBetaSpotsRemaining();
  return (
    <BetaLandingShell isBetaFull={betaFull}>
    <main className="min-h-screen">
      {/* Hero — global Nav + Footer come from root layout */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-20 text-center">
        <h1 className="text-3xl font-medium tracking-tight text-neutral-950 dark:text-neutral-50">
          Turn any Are.na channel
          <br />
          into a website.
        </h1>
        {SHOW_LANDING_HERO_ANIMATION ? <LandingHeroAnimation /> : null}
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4 max-w-md mx-auto leading-relaxed">
          Pick a channel, choose a template, get a site. No code, no hosting
          setup. Your Are.na content, published in seconds.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <BetaCtaLink
            hrefWhenOpen="/login"
            className="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors"
          >
            {betaFull ? "Get notified" : "Get started free"}
          </BetaCtaLink>
          <a
            href="#templates"
            className="px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            See templates
          </a>
        </div>
      </section>

      {/* How it works — mini diagrams reuse the landing hero Are.na → site visual language */}
      <section className="how-it-works-tpl-scope max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100 dark:border-neutral-800">
        <h2 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <HowItWorksConnectIllustration />
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">1. Connect your channel</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 leading-relaxed">
              Log in with Are.na and pick any channel from your account.
            </p>
          </div>
          <div>
            <HowItWorksTemplateIllustration />
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">2. Choose a template</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 leading-relaxed">
              Select a layout that fits your content — blog, portfolio, or feed.
            </p>
          </div>
          <div>
            <HowItWorksPublishIllustration />
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">3. Publish</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 leading-relaxed">
              Pick a subdomain and your site is live at
              your-name.tiny.garden.
            </p>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="py-16 border-t border-neutral-100 dark:border-neutral-800">
        <div className="max-w-3xl mx-auto px-4 mb-6">
          <h2 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            Templates
          </h2>
        </div>
        <TemplateTicker>
          <>
          {/* Blog preview */}
          <TemplatePreview
            name="Blog"
            slug="blog"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="font-medium text-sm mb-2 text-neutral-900 dark:text-neutral-100">Channel Title</div>
              <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-4">
                A short description of the channel
              </div>
              <div className="space-y-3">
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-20 w-full" />
                <div className="space-y-1">
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-2 w-full" />
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-2 w-4/5" />
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-2 w-3/5" />
                </div>
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-16 w-full" />
                <div className="space-y-1">
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-2 w-full" />
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-2 w-2/3" />
                </div>
              </div>
            </div>
          </TemplatePreview>

          {/* Feed preview */}
          <TemplatePreview
            name="Feed"
            slug="feed"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="font-medium text-sm mb-3 text-neutral-900 dark:text-neutral-100">Channel Title</div>
              <div className="grid grid-cols-3 gap-1">
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded aspect-square" />
                <div className="bg-neutral-300 dark:bg-neutral-600 rounded aspect-square" />
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded aspect-square" />
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded aspect-square" />
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded aspect-square" />
                <div className="bg-neutral-300 dark:bg-neutral-600 rounded aspect-square" />
              </div>
            </div>
          </TemplatePreview>

          {/* Portfolio preview */}
          <TemplatePreview
            name="Portfolio"
            slug="portfolio"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="font-medium text-sm mb-3 text-neutral-900 dark:text-neutral-100">Channel Title</div>
              <div className="space-y-3">
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-24 w-full" />
                <div className="space-y-1">
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-2 w-2/3" />
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-2 w-1/2" />
                </div>
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-20 w-full" />
              </div>
            </div>
          </TemplatePreview>

          {/* Slideshow preview */}
          <TemplatePreview
            name="Slideshow"
            slug="slideshow"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="bg-neutral-800 rounded p-3 aspect-[4/3] flex items-center justify-center relative">
                <div className="bg-neutral-600 rounded w-3/4 h-3/4" />
                <div className="absolute bottom-2 left-3 text-[8px] text-neutral-500">1 / 8</div>
              </div>
            </div>
          </TemplatePreview>

          {/* Blank preview */}
          <TemplatePreview
            name="Blank"
            slug="blank"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="space-y-3 pt-2">
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-16 w-full" />
                <div className="space-y-1">
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded h-2 w-full" />
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded h-2 w-3/4" />
                </div>
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-12 w-full" />
              </div>
            </div>
          </TemplatePreview>

          {/* Campaign preview */}
          <TemplatePreview
            name="Campaign"
            slug="campaign"
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
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="flex gap-2">
                <div className="w-1/4 space-y-2 pt-1">
                  <div className="bg-neutral-300 dark:bg-neutral-600 rounded h-2 w-full" />
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-1.5 w-3/4" />
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-1.5 w-2/3" />
                </div>
                <div className="w-3/4 space-y-2">
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-3 w-1/2" />
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded h-2 w-full" />
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded h-2 w-full" />
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded h-2 w-4/5" />
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-16 w-full" />
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded h-2 w-full" />
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded h-2 w-3/5" />
                </div>
              </div>
            </div>
          </TemplatePreview>

          {/* Homepage preview */}
          <TemplatePreview
            name="Homepage"
            slug="homepage"
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
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded aspect-[4/3] flex items-center justify-center relative border border-neutral-200 dark:border-neutral-700">
                <div className="text-center">
                  <div className="bg-neutral-300 dark:bg-neutral-600 rounded h-3 w-28 mx-auto mb-2" />
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-2 w-36 mx-auto" />
                </div>
                <div className="absolute bottom-1 w-full px-3">
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded-full h-0.5 w-full" />
                </div>
              </div>
            </div>
          </TemplatePreview>

          {/* Shop preview */}
          <TemplatePreview
            name="Shop"
            slug="ecommerce"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="flex gap-2">
                <div className="w-1/2 space-y-2 pt-1">
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-3 w-2/3" />
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded h-2 w-full" />
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded h-2 w-4/5" />
                  <div className="bg-neutral-800 rounded h-6 w-24 mt-2" />
                </div>
                <div className="w-1/2">
                  <div className="bg-neutral-200 dark:bg-neutral-700 rounded aspect-square" />
                </div>
              </div>
            </div>
          </TemplatePreview>

          {/* Feature Requests preview */}
          <TemplatePreview
            name="Feature Requests"
            slug="feature-requests"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="space-y-2">
                {["+3", "+1", "+0"].map((v, i) => (
                  <div key={i} className="flex gap-2 items-center bg-white dark:bg-neutral-950 rounded border border-neutral-100 dark:border-neutral-800 p-2">
                    <div className="bg-neutral-100 dark:bg-neutral-800 rounded px-1.5 py-1 text-[8px] font-medium text-neutral-500 dark:text-neutral-400 shrink-0">{v}</div>
                    <div className="flex-1 space-y-1">
                      <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-2 w-3/4" />
                      <div className="bg-neutral-100 dark:bg-neutral-800 rounded h-1.5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TemplatePreview>

          {/* Timeline preview */}
          <TemplatePreview
            name="Timeline"
            slug="timeline"
          >
            <div className="scale-[0.6] origin-top-left w-[166%]">
              <div className="font-medium text-sm mb-3 text-neutral-900 dark:text-neutral-100">Channel Title</div>
              <div className="relative pl-4 border-l border-neutral-200 dark:border-l-neutral-700 space-y-3">
                {["Mar 2026", "Feb 2026", "Jan 2026"].map((date, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950" />
                    <div className="text-[8px] text-neutral-400 dark:text-neutral-500 mb-0.5">{date}</div>
                    <div className="bg-neutral-200 dark:bg-neutral-700 rounded h-2 w-3/4" />
                    <div className="bg-neutral-100 dark:bg-neutral-800 rounded h-1.5 w-1/2 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          </TemplatePreview>
          </>
        </TemplateTicker>

        <div className="max-w-3xl mx-auto px-4 mt-8 text-center">
          <Link
            href="/templates"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors underline underline-offset-2"
          >
            View all templates with live previews
          </Link>
        </div>
      </section>

      <LandingFeatures />

      {/* Pricing */}
      <section
        id="pricing"
        className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100 dark:border-neutral-800"
      >
        <h2 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
          Pricing
        </h2>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-10 max-w-xl leading-relaxed">
          <span className="text-neutral-600 dark:text-neutral-400">Individual</span> always includes a real{" "}
          <span className="text-neutral-600 dark:text-neutral-400">$0</span> tier — publish from Are.na for free; pay only
          if you want extras like daily rebuilds and more sites.{" "}
          <span className="text-neutral-600 dark:text-neutral-400">Small studio</span> is for heavier use. The cards below
          are a preview (checkout isn&apos;t live yet). Beta is limited to {BETA_SPOTS} spots; the
          card above shows availability, or join the waitlist when we&apos;re full.
        </p>

        <PayWhatYouCanPricing
          spotsRemaining={spotsRemaining}
          betaFull={betaFull}
          betaSpots={BETA_SPOTS}
        />
      </section>

      <FeaturedSitesGallery
        sites={featuredSites}
        templateNames={templateNames}
        siteDomain={process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiny.garden"}
      />

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-20 border-t border-neutral-100 dark:border-neutral-800 text-center">
        <p className="text-lg font-medium text-neutral-950 dark:text-neutral-50">
          Your Are.na channel is already a website.
        </p>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-2">
          You just haven&apos;t published it yet.
        </p>
        <BetaCtaLink
          hrefWhenOpen="/login"
          className="inline-block mt-6 px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors"
        >
          {betaFull ? "Get notified" : "Get started free"}
        </BetaCtaLink>
      </section>

    </main>
    </BetaLandingShell>
  );
}
