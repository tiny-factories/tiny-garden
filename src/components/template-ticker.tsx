"use client";

import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

/** Duplicate marquee strip must stay interactive (inert blocks hit-testing). Hide from AT and skip tab order. */
function nonTabbableCopy(node: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === Fragment) {
      return (
        <Fragment key={child.key}>
          {nonTabbableCopy(
            (child.props as { children?: ReactNode }).children,
          )}
        </Fragment>
      );
    }
    return cloneElement(child as ReactElement<{ tabIndex?: number }>, {
      tabIndex: -1,
    });
  });
}

const stripClass =
  "flex shrink-0 gap-7 items-stretch px-4 [&>a]:w-[19rem] [&>a]:max-w-[min(19rem,88vw)] [&>a]:shrink-0 [&>a]:transition-transform [&>a]:duration-300 [&>a]:ease-out [&>a:nth-child(odd)]:-rotate-[2deg] [&>a:nth-child(even)]:rotate-[2deg] [&>a]:origin-center [&>a:hover]:rotate-0 [&>a:hover]:scale-[1.015] [&>a:hover]:z-10 [&>a]:relative";

const stripReducedTiltClass =
  "[&>a:nth-child(odd)]:rotate-0 [&>a:nth-child(even)]:rotate-0";

export function TemplateTicker({ children }: { children: React.ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      className={`template-ticker-mask w-screen max-w-[100vw] -mx-[calc(50vw-50%)] py-8 ${
        reduceMotion ? "overflow-x-auto" : "overflow-hidden"
      }`}
    >
      <div
        className={
          reduceMotion ? "flex w-max gap-7" : "template-ticker-track flex w-max gap-7"
        }
      >
        <div
          className={
            reduceMotion ? `${stripClass} ${stripReducedTiltClass}` : stripClass
          }
        >
          {children}
        </div>
        {!reduceMotion ? (
          <div className={stripClass} aria-hidden>
            {nonTabbableCopy(children)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
