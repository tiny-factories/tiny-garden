"use client";

import { useEffect, useState } from "react";

const stripClass =
  "flex shrink-0 gap-7 items-stretch px-4 [&>a]:w-[19rem] [&>a]:max-w-[min(19rem,88vw)] [&>a]:shrink-0 [&>a]:shadow-sm [&>a]:transition-[transform,box-shadow] [&>a]:duration-300 [&>a]:ease-out [&>a:nth-child(odd)]:-rotate-[4deg] [&>a:nth-child(even)]:rotate-[4deg] [&>a]:origin-center [&>a:hover]:rotate-0 [&>a:hover]:scale-[1.03] [&>a:hover]:shadow-md [&>a:hover]:z-10 [&>a]:relative";

export function TemplateTicker({ children }: { children: React.ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (reduceMotion) {
    return (
      <div className="max-w-5xl mx-auto px-4 overflow-x-auto">
        <div
          className={`flex flex-wrap gap-7 justify-center py-2 min-w-0 ${stripClass} [&>a:nth-child(odd)]:rotate-0 [&>a:nth-child(even)]:rotate-0`}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="template-ticker-mask w-screen max-w-[100vw] -mx-[calc(50vw-50%)] overflow-hidden py-8">
      <div className="template-ticker-track flex w-max gap-7">
        <div className={stripClass}>{children}</div>
        <div className={stripClass} aria-hidden inert>
          {children}
        </div>
      </div>
    </div>
  );
}
