import Link from "next/link";

export interface AdminTemplateExampleTableRow {
  id: string;
  name: string;
  channelSlug: string | null;
  channelTitle: string | null;
}

export function AdminTemplateExamplesTable({
  rows,
  emptyMessage,
}: {
  rows: AdminTemplateExampleTableRow[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-neutral-400 dark:text-neutral-500">
        {emptyMessage ?? "No templates."}
      </p>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded border border-neutral-100 dark:border-neutral-800">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
            <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2 dark:text-neutral-500">
              Template
            </th>
            <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2 dark:text-neutral-500">
              Preview channel
            </th>
            <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2 w-[9rem] dark:text-neutral-500">
              Rendered preview
            </th>
            <th className="text-right text-xs font-medium text-neutral-400 px-3 py-2 w-[8.5rem] dark:text-neutral-500">
              Channel
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const pickerHref = `/admin/template-channels/${encodeURIComponent(t.id)}`;
            const templatePreviewHref = `/api/templates/preview?template=${encodeURIComponent(t.id)}`;
            return (
              <tr
                key={t.id}
                className="border-b border-neutral-50 last:border-0 dark:border-neutral-800/80"
              >
                <td className="px-3 py-2 align-top">
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{t.name}</p>
                  <p className="text-[11px] font-mono text-neutral-400 mt-0.5 dark:text-neutral-500">
                    {t.id}
                  </p>
                </td>
                <td className="px-3 py-2 align-top">
                  {t.channelSlug ? (
                    <a
                      href={`https://www.are.na/channel/${t.channelSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-neutral-50"
                    >
                      {t.channelTitle || t.channelSlug}
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {t.channelSlug ? (
                    <a
                      href={templatePreviewHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-neutral-50"
                    >
                      Open preview
                    </a>
                  ) : (
                    <span
                      className="text-xs text-neutral-400 dark:text-neutral-500 cursor-default"
                      title="Choose a preview channel first"
                    >
                      —
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <Link
                    href={pickerHref}
                    className="text-xs text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-neutral-50"
                  >
                    {t.channelSlug ? "Change channel" : "Select channel"}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
