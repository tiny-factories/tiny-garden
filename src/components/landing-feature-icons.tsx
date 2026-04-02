/**
 * Custom mini illustrations for the landing features grid — hover motion is CSS-only (parent must use `group`).
 * Strokes use width 2 in a 24×24 viewBox to align with Lucide at default weight.
 */

import { useId } from "react";

const FEATURE_ICON_PX = 32;

export type LandingFeatureIconKind =
  | "blocks"
  | "subdomain"
  | "zap"
  | "templates"
  | "calendar"
  | "lock";

export function LandingFeatureIcon({ kind }: { kind: LandingFeatureIconKind }) {
  return (
    <span
      className="pointer-events-none flex h-12 w-12 shrink-0 items-center justify-center text-emerald-700 dark:text-emerald-400"
      aria-hidden
    >
      {kind === "blocks" ? <IconBlocks /> : null}
      {kind === "subdomain" ? <IconSubdomainLink /> : null}
      {kind === "zap" ? <IconZap /> : null}
      {kind === "templates" ? <IconTemplates /> : null}
      {kind === "calendar" ? <IconDeskCalendar /> : null}
      {kind === "lock" ? <IconLock /> : null}
    </span>
  );
}

function IconBlocks() {
  const cell = "stroke-current fill-none";
  /* Same rhythm as templates bento: 5u inset, 4u gutters, 5×5 cells (mirrors bottom-row tile width + gaps). */
  return (
    <svg
      width={FEATURE_ICON_PX}
      height={FEATURE_ICON_PX}
      viewBox="0 0 24 24"
      fill="none"
      className="overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="5" y="5" width="5" height="5" rx="1" className={cell} strokeWidth={2} />
      <rect x="14" y="5" width="5" height="5" rx="1" className={cell} strokeWidth={2} />
      <rect x="5" y="14" width="5" height="5" rx="1" className={cell} strokeWidth={2} />
      <g className="translate-x-[3px] translate-y-[3px] transition-transform duration-300 ease-[cubic-bezier(0.34,1.45,0.64,1)] group-hover:translate-x-0 group-hover:translate-y-0 motion-reduce:translate-x-0 motion-reduce:translate-y-0">
        <rect x="14" y="14" width="5" height="5" rx="1" className={cell} strokeWidth={2} />
      </g>
    </svg>
  );
}

/**
 * Lucide `Link2` (link-2.js) — reads as “your URL / hostname” without a globe.
 */
function IconSubdomainLink() {
  return (
    <svg
      width={FEATURE_ICON_PX}
      height={FEATURE_ICON_PX}
      viewBox="0 0 24 24"
      fill="none"
      className="overflow-visible transition-transform duration-300 ease-[cubic-bezier(0.34,1,0.64,1)] group-hover:scale-[1.07] motion-reduce:group-hover:scale-100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 17H7A5 5 0 0 1 7 7h2"
        className="stroke-current"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7h2a5 5 0 1 1 0 10h-2"
        className="stroke-current"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform="translate(12 12)">
        <g className="landing-feature-link-bridge">
          <line x1="-4" y1="0" x2="4" y2="0" className="stroke-current" strokeWidth={2} strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

const ZAP_PATH_D = "M13 2L4 14h7l-1 8 10-13h-7l0-7z";

/** Single bolt; stroke redraws on card hover (globals.css). */
function IconZap() {
  return (
    <svg
      width={FEATURE_ICON_PX}
      height={FEATURE_ICON_PX}
      viewBox="0 0 24 24"
      fill="none"
      className="overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        pathLength={100}
        d={ZAP_PATH_D}
        className="landing-feature-zap-path stroke-current"
        fill="none"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Bento-style layout with outer padding + gutters; geometry morphs on hover (globals.css).
 */
function IconTemplates() {
  return (
    <svg
      width={FEATURE_ICON_PX}
      height={FEATURE_ICON_PX}
      viewBox="0 0 24 24"
      fill="none"
      className="landing-feature-templates-bento overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect className="landing-template-cell-1 stroke-current" x={5} y={5} width={14} height={4} rx={1} fill="none" strokeWidth={2} />
      <rect className="landing-template-cell-2 stroke-current" x={5} y={13} width={5} height={7} rx={1} fill="none" strokeWidth={2} />
      <rect className="landing-template-cell-3 stroke-current" x={14} y={13} width={5} height={7} rx={1} fill="none" strokeWidth={2} />
    </svg>
  );
}

/** Desk calendar frame; day number crossfades on hover (no tear animation). */
function IconDeskCalendar() {
  const clipId = `cal-${useId().replace(/\W/g, "")}`;
  return (
    <svg
      width={FEATURE_ICON_PX}
      height={FEATURE_ICON_PX}
      viewBox="0 0 24 24"
      fill="none"
      className="overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Inset inside stroke so glyphs never spill past the rounded frame */}
        <clipPath id={clipId}>
          <rect x="6" y="8.5" width="12" height="11.5" rx="1.5" />
        </clipPath>
      </defs>
      <rect x="5" y="7" width="14" height="14" rx="2" className="stroke-current" strokeWidth={2} fill="none" />
      <line x1="8" y1="4" x2="8" y2="8" className="stroke-current" strokeWidth={2} strokeLinecap="round" />
      <line x1="16" y1="4" x2="16" y2="8" className="stroke-current" strokeWidth={2} strokeLinecap="round" />
      <g clipPath={`url(#${clipId})`}>
        <g transform="translate(12 14.25)">
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current font-semibold landing-feature-cal-day landing-feature-cal-day--from"
            style={{ fontSize: 9 }}
          >
            14
          </text>
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current font-semibold landing-feature-cal-day landing-feature-cal-day--to"
            style={{ fontSize: 9 }}
          >
            15
          </text>
        </g>
      </g>
    </svg>
  );
}

function IconLock() {
  /* Lucide closed `Lock` shackle (lock.js); pivot (7,11) → rotate open on hover. Open path (lock-open) reads unlatched even at 0°. */
  return (
    <svg
      width={FEATURE_ICON_PX}
      height={FEATURE_ICON_PX}
      viewBox="0 0 24 24"
      fill="none"
      className="overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(7 11)">
        <g className="rotate-0 transition-transform duration-[380ms] ease-[cubic-bezier(0.34,1.28,0.64,1)] group-hover:-rotate-[44deg] motion-reduce:group-hover:rotate-0">
          <g transform="translate(-7 -11)">
            <path
              d="M7 11V7a5 5 0 0 1 10 0v4"
              className="stroke-current"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </g>
      </g>
      <g>
        <rect x="3" y="11" width="18" height="11" rx="2" className="stroke-current" strokeWidth={2} fill="none" />
        <circle cx="12" cy="16.5" r="1.25" className="fill-current" />
      </g>
    </svg>
  );
}
