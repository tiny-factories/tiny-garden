"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { IdeTextEditor } from "@/components/ide-text-editor";
import { FONT_PICKER_OPTIONS, fontFamilyCSS, googleFontsURL } from "@/lib/fonts";
import {
  type ThemeColors,
  type ThemeFonts,
  expandThemeHex,
  formatThemeCss,
  normalizeFontToken,
  parseThemeCss,
} from "@/lib/theme-css-tokens";

const ROW = "min-h-[1.625rem] leading-[1.625rem]";

const THEME_FONT_PICKER_LINK_ID = "tiny-garden-theme-font-picker-gf";

function ensureGoogleFontsLoadedForPicker() {
  if (typeof document === "undefined") return;
  if (document.getElementById(THEME_FONT_PICKER_LINK_ID)) return;
  const url = googleFontsURL(FONT_PICKER_OPTIONS.map((o) => o.token));
  if (!url) return;
  const link = document.createElement("link");
  link.id = THEME_FONT_PICKER_LINK_ID;
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}
const COLOR_KEYS: { key: keyof ThemeColors; varName: string }[] = [
  { key: "background", varName: "--color-bg" },
  { key: "text", varName: "--color-text" },
  { key: "accent", varName: "--color-accent" },
  { key: "border", varName: "--color-border" },
];

function ColorValuePill({
  hex,
  onChange,
  ariaLabel,
}: {
  hex: string;
  onChange: (normalizedHex: string) => void;
  ariaLabel: string;
}) {
  const [text, setText] = useState(hex);
  useEffect(() => setText(hex), [hex]);

  const pickerValue = expandThemeHex(text) ?? expandThemeHex(hex) ?? "#808080";

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-1.5 py-0.5 align-middle shadow-sm dark:border-neutral-600 dark:bg-neutral-800/90">
      <label className="relative size-5 shrink-0 cursor-pointer overflow-hidden rounded border border-neutral-200 dark:border-neutral-600">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => {
            const next = e.target.value.toLowerCase();
            setText(next);
            onChange(next);
          }}
          className="absolute inset-0 h-[200%] w-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer border-0 p-0"
          aria-label={`${ariaLabel}, color picker`}
        />
      </label>
      <input
        type="text"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          const x = expandThemeHex(v);
          if (x) onChange(x);
        }}
        onBlur={() => {
          const x = expandThemeHex(text);
          if (x) {
            setText(x);
            onChange(x);
          } else {
            setText(hex);
          }
        }}
        spellCheck={false}
        className="w-[6.25rem] shrink-0 border-0 bg-transparent p-0 font-mono text-[12px] text-neutral-800 outline-none dark:text-neutral-200"
        aria-label={`${ariaLabel}, hex value`}
      />
    </span>
  );
}

function FontValuePill({
  value,
  onCommit,
  ariaLabel,
}: {
  value: string;
  onCommit: (token: string) => void;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  /** After opening via chevron, show full list until the user types in the field. */
  const [menuShowAll, setMenuShowAll] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const listId = useId();

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (open) ensureGoogleFontsLoadedForPicker();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
        setMenuShowAll(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMenuShowAll(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filteredOptions = useMemo(() => {
    if (open && menuShowAll) return FONT_PICKER_OPTIONS;
    const q = draft.trim().toLowerCase();
    if (!q) return FONT_PICKER_OPTIONS;
    return FONT_PICKER_OPTIONS.filter(
      (o) =>
        o.token.toLowerCase().includes(q) ||
        o.label.toLowerCase().includes(q) ||
        o.token.replace(/^gf:/i, "").toLowerCase().includes(q)
    );
  }, [draft, open, menuShowAll]);

  const pick = (token: string) => {
    onCommit(token);
    setDraft(token);
    setOpen(false);
    setMenuShowAll(false);
  };

  const toggleMenu = () => {
    setOpen((o) => {
      const next = !o;
      if (next) setMenuShowAll(true);
      else setMenuShowAll(false);
      return next;
    });
  };

  return (
    <span
      ref={containerRef}
      className="relative inline-flex max-w-full min-w-[11rem] items-stretch rounded-md border border-neutral-300 bg-white align-middle shadow-sm dark:border-neutral-600 dark:bg-neutral-800/90"
    >
      <span className="inline-flex min-w-0 flex-1 items-center pl-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => {
          setMenuShowAll(false);
          setDraft(e.target.value);
        }}
          onBlur={() => {
            const n = normalizeFontToken(draft);
            if (n) {
              onCommit(n);
              setDraft(n);
            } else {
              setDraft(value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setOpen(false);
              setMenuShowAll(false);
            }
          }}
          spellCheck={false}
          className="min-w-0 flex-1 border-0 bg-transparent py-0.5 pr-1 font-mono text-[12px] text-neutral-800 outline-none dark:text-neutral-200"
          aria-label={ariaLabel}
          aria-autocomplete="list"
        />
        <button
          type="button"
          className="flex shrink-0 items-center justify-center rounded-r-md border-l border-neutral-200 px-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:border-neutral-600 dark:hover:bg-neutral-700/80 dark:hover:text-neutral-200"
          aria-label={`${ariaLabel}, open font list`}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleMenu}
        >
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </span>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-52 min-w-full overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-600 dark:bg-neutral-900"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-2 py-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
              No matching fonts
            </li>
          ) : (
            filteredOptions.map((o) => (
              <li key={o.token} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={o.token === value}
                  title={o.label}
                  className="block w-full min-w-0 cursor-pointer truncate px-2 py-1.5 text-left text-[12px] leading-snug text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  style={{ fontFamily: fontFamilyCSS(o.token) }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o.token)}
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </span>
  );
}

const GUTTER =
  "w-10 shrink-0 overflow-y-auto border-r border-neutral-200/90 bg-neutral-100 py-3 pl-2 pr-1 text-right font-mono text-[11px] leading-[1.625rem] text-neutral-400 tabular-nums [scrollbar-width:none] dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-600 [&::-webkit-scrollbar]:hidden";

const LINE_COUNT = 10;

/**
 * Code-like editor: color rows use [swatch + hex] pills; font rows use token pills.
 * Falls back to raw textarea when the draft does not parse.
 */
export function ThemeTokensPillEditor({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  const parsed = useMemo(() => parseThemeCss(value), [value]);

  const emit = useCallback(
    (colors: ThemeColors, fonts: ThemeFonts) => {
      onChange(formatThemeCss(colors, fonts));
    },
    [onChange]
  );

  if (!parsed.ok) {
    return <IdeTextEditor value={value} onChange={onChange} ariaLabel={ariaLabel} />;
  }

  const { colors, fonts } = parsed;

  return (
    <div className="flex h-full min-h-[min(12rem,38vh)] w-full md:min-h-[min(16rem,45vh)]">
      <div className={GUTTER} aria-hidden>
        {Array.from({ length: LINE_COUNT }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto py-3 pr-3 font-mono text-[13px] text-neutral-800 dark:text-neutral-200">
        <div className={`${ROW} text-neutral-500 dark:text-neutral-500`}>
          {`/* Theme tokens — saved as themeColors + themeFonts; injected on build */`}
        </div>
        <div className={ROW}>
          :root <span className="text-neutral-600 dark:text-neutral-400">{"{"}</span>
        </div>
        <div
          className={`${ROW} pl-3 text-[10px] leading-[1.625rem] text-neutral-500 dark:text-neutral-500`}
        >
          <span className="text-neutral-400 dark:text-neutral-600">{`/* `}</span>
          Colors: hex pills · Fonts: type a token or use the{" "}
          <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-400">▾</span> menu (
          <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-400">system</span>,{" "}
          <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-400">inter</span>,{" "}
          <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-400">gf:…</span>
          ).
          <span className="text-neutral-400 dark:text-neutral-600">{` */`}</span>
        </div>
        {COLOR_KEYS.map(({ key, varName }) => (
          <div key={varName} className={`${ROW} flex flex-wrap items-center gap-x-1 pl-3`}>
            <span className="text-sky-700/90 dark:text-sky-400/90">{varName}</span>
            <span className="text-neutral-500">:</span>
            <ColorValuePill
              hex={colors[key]}
              ariaLabel={varName}
              onChange={(hex) => emit({ ...colors, [key]: hex }, fonts)}
            />
            <span className="text-neutral-500">;</span>
          </div>
        ))}
        <div className={`${ROW} flex flex-wrap items-center gap-x-1 pl-3`}>
          <span className="text-sky-700/90 dark:text-sky-400/90">--font-heading</span>
          <span className="text-neutral-500">:</span>
          <FontValuePill
            value={fonts.heading}
            ariaLabel="--font-heading"
            onCommit={(token) => emit(colors, { ...fonts, heading: token })}
          />
          <span className="text-neutral-500">;</span>
        </div>
        <div className={`${ROW} flex flex-wrap items-center gap-x-1 pl-3`}>
          <span className="text-sky-700/90 dark:text-sky-400/90">--font-body</span>
          <span className="text-neutral-500">:</span>
          <FontValuePill
            value={fonts.body}
            ariaLabel="--font-body"
            onCommit={(token) => emit(colors, { ...fonts, body: token })}
          />
          <span className="text-neutral-500">;</span>
        </div>
        <div className={ROW}>
          <span className="text-neutral-600 dark:text-neutral-400">{"}"}</span>
        </div>
      </div>
    </div>
  );
}
