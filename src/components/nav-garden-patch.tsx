"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { generatePlantDataURI, seedFromSubdomain } from "@/lib/garden-icon";

const PATCH_FLOWER_SRCS = [0, 1, 2, 3, 4].map((i) =>
  generatePlantDataURI(seedFromSubdomain(`tiny.garden:patch:${i}`)),
);

type PatchItem =
  | { kind: "grass"; height: number; amp: string; delay: string }
  | { kind: "flower"; src: string; amp: string; delay: string };

const PATCH_LAYOUT: PatchItem[] = [
  { kind: "grass", height: 11, amp: "9deg", delay: "0ms" },
  { kind: "grass", height: 15, amp: "11deg", delay: "40ms" },
  { kind: "flower", src: PATCH_FLOWER_SRCS[0]!, amp: "6deg", delay: "80ms" },
  { kind: "grass", height: 9, amp: "8deg", delay: "20ms" },
  { kind: "flower", src: PATCH_FLOWER_SRCS[1]!, amp: "5deg", delay: "100ms" },
  { kind: "grass", height: 13, amp: "10deg", delay: "60ms" },
  { kind: "flower", src: PATCH_FLOWER_SRCS[2]!, amp: "6deg", delay: "0ms" },
  { kind: "grass", height: 10, amp: "9deg", delay: "50ms" },
  { kind: "flower", src: PATCH_FLOWER_SRCS[3]!, amp: "5deg", delay: "90ms" },
  { kind: "grass", height: 12, amp: "10deg", delay: "30ms" },
  { kind: "flower", src: PATCH_FLOWER_SRCS[4]!, amp: "6deg", delay: "70ms" },
  { kind: "grass", height: 8, amp: "12deg", delay: "10ms" },
];

export function NavGardenPatch() {
  return (
    <div
      className="nav-garden-patch inline-flex max-w-full cursor-default items-end justify-center gap-px rounded-full border border-emerald-200/70 bg-linear-to-b from-emerald-50/95 to-amber-50/35 px-1.5 py-0.5 shadow-sm select-none"
      aria-hidden
    >
      {PATCH_LAYOUT.map((item, i) => {
        if (item.kind === "grass") {
          return (
            <span
              key={`g-${i}`}
              className="nav-patch-sway w-0.5 shrink-0 rounded-full bg-linear-to-t from-emerald-800/88 to-emerald-500/80"
              style={
                {
                  height: item.height,
                  "--patch-amp": item.amp,
                  animationDelay: item.delay,
                } as CSSProperties
              }
            />
          );
        }
        return (
          <span
            key={`f-${i}`}
            className="nav-patch-sway inline-flex shrink-0 items-end"
            style={
              {
                "--patch-amp": item.amp,
                animationDelay: item.delay,
              } as CSSProperties
            }
          >
            <Image
              src={item.src}
              alt=""
              width={14}
              height={14}
              unoptimized
              className="size-3.5 rounded-sm border border-emerald-900/8 bg-white object-contain [image-rendering:crisp-edges]"
            />
          </span>
        );
      })}
    </div>
  );
}
