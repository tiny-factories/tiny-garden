/**
 * Optional team notifications via a Discord incoming webhook.
 * Set DISCORD_TEAM_WEBHOOK_URL in server env only (never NEXT_PUBLIC_*).
 * Anyone with the URL can post to your channel — rotate it if leaked.
 */

type EmbedField = { name: string; value: string; inline?: boolean };

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export async function discordTeamNotify(opts: {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: EmbedField[];
}): Promise<void> {
  const hook = process.env.DISCORD_TEAM_WEBHOOK_URL?.trim();
  if (!hook) return;

  const embed = {
    title: clip(opts.title, 256),
    description: opts.description ? clip(opts.description, 4000) : undefined,
    url: opts.url,
    color: opts.color ?? 0x5865f2,
    fields: opts.fields?.slice(0, 25).map((f) => ({
      name: clip(f.name, 256),
      value: clip(f.value, 1024),
      ...(f.inline !== undefined ? { inline: f.inline } : {}),
    })),
    timestamp: new Date().toISOString(),
  };

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 12_000);
    const res = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: ac.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[discord-team] webhook_non_ok", res.status, clip(text, 400));
    }
  } catch (e) {
    console.warn("[discord-team] webhook_failed", e);
  }
}
