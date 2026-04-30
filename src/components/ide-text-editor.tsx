"use client";

import { useMemo, useSyncExternalStore } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { css } from "@codemirror/lang-css";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { EditorView } from "@codemirror/view";

function usePrefersDarkMode(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false
  );
}

/** Match Theme tab panel (#fafafa / #1e1e1e) and prior line gutter. */
function panelChromeExtension(prefersDark: boolean) {
  return EditorView.theme(
    {
      "&": {
        backgroundColor: "transparent",
        fontSize: "13px",
        lineHeight: "1.625rem",
      },
      ".cm-scroller": {
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        lineHeight: "1.625rem",
        minWidth: "0",
      },
      ".cm-content": { paddingTop: "12px", paddingBottom: "12px", minWidth: "0" },
      ".cm-gutters": {
        backgroundColor: prefersDark ? "rgb(23 23 23 / 0.85)" : "rgb(245 245 245)",
        borderRight: prefersDark
          ? "1px solid rgb(64 64 64)"
          : "1px solid rgb(229 229 229 / 0.9)",
        color: prefersDark ? "rgb(82 82 82)" : "rgb(163 163 163)",
        paddingRight: "4px",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        padding: "0 4px 0 8px",
        minWidth: "2.25rem",
        textAlign: "right",
        fontSize: "11px",
      },
      ".cm-activeLineGutter": {
        backgroundColor: prefersDark ? "rgb(38 38 38)" : "rgb(229 229 229 / 0.45)",
      },
    }
  );
}

/** Keep the editor inside flex parents (min-width:0) and let .cm-scroller scroll wide content. */
const fillHeight = EditorView.theme({
  "&": { height: "100%", minWidth: "0", maxWidth: "100%" },
  ".cm-editor": { height: "100%", minWidth: "0", maxWidth: "100%" },
  ".cm-scroller": { minHeight: "100%", minWidth: "0" },
});

/**
 * Line numbers + CSS syntax highlighting (GitHub light / dark from system preference).
 */
export function IdeTextEditor({
  value,
  onChange,
  ariaLabel,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  placeholder?: string;
}) {
  const prefersDark = usePrefersDarkMode();
  const theme = prefersDark ? githubDark : githubLight;

  const extensions = useMemo(
    () => [css(), fillHeight, panelChromeExtension(prefersDark)],
    [prefersDark]
  );

  return (
    <div className="flex h-full min-h-[min(12rem,38vh)] w-full min-w-0 max-w-full overflow-hidden md:min-h-[min(16rem,45vh)]">
      <CodeMirror
        value={value}
        height="100%"
        theme={theme}
        extensions={extensions}
        onChange={onChange}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          highlightSelectionMatches: false,
        }}
        className="min-h-0 min-w-0 max-w-full flex-1 overflow-hidden [&_.cm-editor]:min-h-[min(12rem,38vh)] md:[&_.cm-editor]:min-h-[min(16rem,45vh)] [&_.cm-focused]:outline-none"
        aria-label={ariaLabel}
      />
    </div>
  );
}
