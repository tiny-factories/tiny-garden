import Link from "next/link";
import { TerminalSquare, Search, RefreshCw, Download } from "lucide-react";
import { BetaCtaLink, BetaLandingShell } from "@/components/beta-landing-shell";
import { CliTerminalDemo } from "@/components/cli-terminal-demo";
import { isBetaFull } from "@/lib/beta";

function CliFeature({
  icon: Icon,
  title,
  copy,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  copy: string;
}) {
  return (
    <div className="p-4 border border-neutral-100 dark:border-neutral-800 rounded">
      <Icon className="size-4 text-neutral-500 dark:text-neutral-400 mb-2" />
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {title}
      </p>
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 leading-relaxed">
        {copy}
      </p>
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CliPage() {
  const betaFull = await isBetaFull();

  return (
    <BetaLandingShell isBetaFull={betaFull}>
      <main className="min-h-screen">
        <section className="max-w-3xl mx-auto px-4 pt-16 pb-20 text-center">
          <h1 className="text-3xl font-medium tracking-tight text-neutral-950 dark:text-neutral-50">
            tiny.garden CLI
            <br />
            publish from your terminal.
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4 max-w-xl mx-auto leading-relaxed">
            Create sites, search your work and public sites, edit theme/CSS, run
            manual refreshes, and save local backups without leaving the command
            line.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <BetaCtaLink
              hrefWhenOpen="/login"
              className="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors"
            >
              Generate API token
            </BetaCtaLink>
            <a
              href="#terminal-demo"
              className="px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              See terminal demo
            </a>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100 dark:border-neutral-800">
          <h2 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-8">
            Core commands
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CliFeature
              icon={TerminalSquare}
              title="Create and configure sites"
              copy="Run the full new-site flow from terminal prompts or pass channel/template/subdomain flags."
            />
            <CliFeature
              icon={Search}
              title="Search mine + public"
              copy="Search across your private dashboard inventory and discoverable public tiny.garden sites."
            />
            <CliFeature
              icon={RefreshCw}
              title="Manual refresh with limits"
              copy="Request a rebuild when needed, with cooldown/quota safeguards to control API cost."
            />
            <CliFeature
              icon={Download}
              title="Backup to local files"
              copy="Export the hosted HTML for any owned site to a local directory for archives and handoff."
            />
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100 dark:border-neutral-800">
          <h2 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">
            Quickstart
          </h2>
          <div className="rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4 overflow-x-auto">
            <pre className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-200">
              <code>{`npm --prefix cli install
npm --prefix cli run start -- auth login --token tg_pat_...
npm --prefix cli run start -- new --wait
npm --prefix cli run start -- site css edit my-subdomain
npm --prefix cli run start -- site refresh my-subdomain --wait
npm --prefix cli run start -- site backup my-subdomain --out ~/Sites/my-backup`}</code>
            </pre>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-3">
            CLI is in active development and currently ships from this repository.
          </p>
        </section>

        <section
          id="terminal-demo"
          className="max-w-3xl mx-auto px-4 py-16 border-t border-neutral-100 dark:border-neutral-800"
        >
          <h2 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
            Interactive terminal demo
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed max-w-xl">
            Click through common flows to preview terminal commands and output
            exactly like a customer would see in CLI-first usage.
          </p>
          <CliTerminalDemo />
        </section>

        <section className="max-w-3xl mx-auto px-4 py-20 border-t border-neutral-100 dark:border-neutral-800 text-center">
          <p className="text-lg font-medium text-neutral-950 dark:text-neutral-50">
            Build and ship from terminal, not tabs.
          </p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-2">
            Same tiny.garden flow, optimized for CLI-first customers.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <BetaCtaLink
              hrefWhenOpen="/login"
              className="inline-block px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors"
            >
              Create token
            </BetaCtaLink>
            <Link
              href="/"
              className="inline-block px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </section>
      </main>
    </BetaLandingShell>
  );
}
