/**
 * Custom mini illustrations for the landing features grid — hover motion is CSS-only (parent must use `group`).
 */

export type LandingFeatureIconKind =
  | "blocks"
  | "globe"
  | "zap"
  | "templates"
  | "rebuild"
  | "lock";

export function LandingFeatureIcon({ kind }: { kind: LandingFeatureIconKind }) {
  return (
    <span
      className="pointer-events-none flex size-9 shrink-0 items-center justify-center text-emerald-700 dark:text-emerald-400"
      aria-hidden
    >
      {kind === "blocks" ? <IconBlocks /> : null}
      {kind === "globe" ? <IconGlobe /> : null}
      {kind === "zap" ? <IconZap /> : null}
      {kind === "templates" ? <IconTemplates /> : null}
      {kind === "rebuild" ? <IconRebuild /> : null}
      {kind === "lock" ? <IconLock /> : null}
    </span>
  );
}

function IconBlocks() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      className="overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="9" height="9" rx="1.25" className="fill-current" />
      <rect x="13" y="2" width="9" height="9" rx="1.25" className="fill-current" />
      <rect x="2" y="13" width="9" height="9" rx="1.25" className="fill-current" />
      <g
        className="translate-x-[3.5px] -translate-y-[3.5px] transition-transform duration-300 ease-[cubic-bezier(0.34,1.45,0.64,1)] group-hover:translate-x-0 group-hover:translate-y-0 motion-reduce:translate-x-0 motion-reduce:translate-y-0"
      >
        <rect x="13" y="13" width="9" height="9" rx="1.25" className="fill-current" />
      </g>
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      className="overflow-visible transition-transform duration-[1.15s] ease-out motion-reduce:group-hover:rotate-0 group-hover:rotate-[360deg]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" className="stroke-current" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="4" ry="9" className="stroke-current" strokeWidth="1.5" />
      <path
        d="M3 12h18M12 3c2.5 3.2 2.5 14.8 0 18M12 3c-2.5 3.2-2.5 14.8 0 18"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconZap() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      className="overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        pathLength={100}
        d="M13 2L4 14h7l-1 8 10-13h-7l0-7z"
        className="landing-feature-zap-path stroke-current"
        strokeWidth="1.65"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function IconTemplates() {
  return (
    <div className="flex w-5 flex-col justify-center gap-[5px]">
      <div className="h-[5px] w-[14px] rounded-[2px] bg-current transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:w-[18px] motion-reduce:transition-none motion-reduce:group-hover:w-[14px]" />
      <div className="h-[5px] w-[18px] rounded-[2px] bg-current transition-[width] delay-75 duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:w-[10px] motion-reduce:transition-none motion-reduce:group-hover:w-[18px]" />
      <div className="h-[5px] w-[10px] rounded-[2px] bg-current transition-[width] delay-150 duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:w-[16px] motion-reduce:transition-none motion-reduce:group-hover:w-[10px]" />
    </div>
  );
}

function IconRebuild() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      className="motion-reduce:group-hover:rotate-0 overflow-visible transition-transform duration-700 ease-out group-hover:rotate-[360deg]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
        className="stroke-current"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 3v5h5" className="stroke-current" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"
        className="stroke-current"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 16h5v5" className="stroke-current" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      className="overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        className="origin-[7px_11px] -rotate-[34deg] transition-transform duration-[380ms] ease-[cubic-bezier(0.34,1.28,0.64,1)] group-hover:rotate-0 motion-reduce:rotate-0"
      >
        <path
          d="M7 11V7a5 5 0 0 1 9.9-1"
          className="stroke-current"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      <g className="landing-feature-lock-body origin-center">
        <rect x="3" y="11" width="18" height="11" rx="2" className="stroke-current" strokeWidth="1.65" fill="none" />
        <circle cx="12" cy="16.5" r="1.25" className="fill-current" />
      </g>
    </svg>
  );
}
