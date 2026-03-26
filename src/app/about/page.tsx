import Link from "next/link";

export default function About() {
  return (
    <main className="min-h-screen">
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-16">
        <h1 className="text-2xl font-medium tracking-tight">About</h1>

        <p className="text-sm text-neutral-500 mt-6 max-w-lg leading-relaxed">
          tiny.garden turns{" "}
          <a
            href="https://are.na"
            className="underline underline-offset-2 hover:text-neutral-900 transition-colors"
          >
            Are.na
          </a>{" "}
          channels into websites. If you already organize ideas, images, and
          links in Are.na, tiny.garden lets you publish that collection as a
          clean, static site on its own subdomain — no code, no hosting setup.
          It&apos;s inspired by{" "}
          <span className="text-neutral-700">Small Victories</span>, which did
          the same for Dropbox.
        </p>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-4 py-12 border-t border-neutral-100">
        <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">
          How it works
        </h2>
        <ol className="space-y-4 text-sm text-neutral-500 leading-relaxed max-w-lg">
          <li>
            <span className="text-neutral-900 font-medium">1. Log in with Are.na</span>{" "}
            — connect your account in one click.
          </li>
          <li>
            <span className="text-neutral-900 font-medium">2. Pick a channel</span>{" "}
            — any channel from your account becomes your content source.
          </li>
          <li>
            <span className="text-neutral-900 font-medium">3. Choose a template</span>{" "}
            — blog, portfolio, feed, slideshow, and more.
          </li>
          <li>
            <span className="text-neutral-900 font-medium">4. Publish</span>{" "}
            — your site is live at your-name.tiny.garden. Update the channel,
            rebuild the site.
          </li>
        </ol>
      </section>

      {/* Built by */}
      <section className="max-w-3xl mx-auto px-4 py-12 border-t border-neutral-100">
        <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">
          Built by
        </h2>
        <p className="text-sm text-neutral-500 leading-relaxed max-w-lg">
          tiny.garden is made by{" "}
          <a
            href="https://tinyfactories.space"
            className="underline underline-offset-2 hover:text-neutral-900 transition-colors"
          >
            Tiny Factories
          </a>
          , a collective of independent makers. The project is open source.
        </p>
        <div className="mt-6 flex items-center gap-4">
          <a
            href="https://are.na"
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors underline underline-offset-2"
          >
            Are.na
          </a>
          <a
            href="https://github.com/tiny-factories/tiny-garden"
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors underline underline-offset-2"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100 text-center">
        <p className="text-sm text-neutral-500">
          Ready to turn a channel into a site?
        </p>
        <Link
          href="/login"
          className="inline-block mt-4 px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
        >
          Get started
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
          <Link
            href="/about"
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            About
          </Link>
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
