#!/usr/bin/env node
import fs from "fs/promises";
import os from "os";
import path from "path";
import readline from "readline/promises";
import { spawnSync } from "child_process";
import crypto from "crypto";
import { stdin as input, stdout as output } from "process";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [k: string]: JsonValue };

interface CliConfig {
  apiBaseUrl: string;
  token?: string;
}

interface SiteSummary {
  id: string;
  subdomain: string;
  channelSlug: string;
  channelTitle: string;
  template: string;
  published: boolean;
  discoverable?: boolean;
}

interface ThemeColors {
  background: string;
  text: string;
  accent: string;
  border: string;
}

interface ThemeFonts {
  heading: string;
  body: string;
}

interface ApiErrorPayload {
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

interface SearchItem extends SiteSummary {
  owner: { arenaUsername: string; isSelf: boolean };
  url: string;
}

interface SearchResponse {
  items: SearchItem[];
}

interface ExportResponse {
  url: string;
  subdomain: string;
}

const DEFAULT_API = "https://tiny.garden";
const CONFIG_DIR = path.join(os.homedir(), ".config", "tiny-garden");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const DEFAULT_THEME_COLORS: ThemeColors = {
  background: "#ffffff",
  text: "#1a1a1a",
  accent: "#555555",
  border: "#e5e5e5",
};
const DEFAULT_THEME_FONTS: ThemeFonts = {
  heading: "system",
  body: "system",
};

function normalizeApiBase(url: string): string {
  return url.replace(/\/+$/, "");
}

function parseArgs(argv: string[]): {
  command: string[];
  flags: Record<string, string | boolean>;
} {
  const command: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      command.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return { command, flags };
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeSiteNeedle(raw: string): string {
  let value = raw.trim().toLowerCase();
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const host = new URL(value).hostname.toLowerCase();
      value = host;
    } catch {
      // Keep original value when URL parsing fails.
    }
  }
  if (value.includes(".")) {
    const [firstLabel] = value.split(".");
    if (firstLabel) return firstLabel;
  }
  return value;
}

function getFlagString(
  flags: Record<string, string | boolean>,
  key: string
): string | null {
  const value = flags[key];
  return typeof value === "string" ? value : null;
}

function getFlagNumber(
  flags: Record<string, string | boolean>,
  key: string,
  fallback: number
): number {
  const raw = getFlagString(flags, key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function extensionFromContentType(contentType: string | null): string {
  if (!contentType) return ".bin";
  if (contentType.includes("text/css")) return ".css";
  if (contentType.includes("text/html")) return ".html";
  if (contentType.includes("image/png")) return ".png";
  if (contentType.includes("image/jpeg")) return ".jpg";
  if (contentType.includes("image/gif")) return ".gif";
  if (contentType.includes("image/webp")) return ".webp";
  if (contentType.includes("image/svg+xml")) return ".svg";
  if (contentType.includes("application/javascript")) return ".js";
  if (contentType.includes("application/json")) return ".json";
  return ".bin";
}

function shortHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function formatApiError(status: number, data: unknown): string {
  const payload = (data || {}) as ApiErrorPayload;
  const base = payload.error || `Request failed (${status})`;
  const code = payload.code ? ` [${payload.code}]` : "";

  if (payload.code === "unauthorized") {
    return `${base}${code}\nHint: run "tg auth login --token <token>".`;
  }
  if (payload.code === "build_cooldown") {
    const retry = payload.details?.retryAfterSeconds;
    const suffix =
      typeof retry === "number" ? ` Retry in about ${Math.ceil(retry)}s.` : "";
    return `${base}${code}${suffix}`;
  }
  if (payload.code === "build_quota_exceeded") {
    const used = payload.details?.used;
    const limit = payload.details?.limit;
    if (typeof used === "number" && typeof limit === "number") {
      return `${base}${code} (${used}/${limit} used today).`;
    }
  }
  return `${base}${code}`;
}

function ensureOk(status: number, data: unknown): void {
  if (status >= 200 && status < 300) return;
  throw new Error(formatApiError(status, data));
}

async function readConfig(): Promise<CliConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as CliConfig;
    return {
      apiBaseUrl: normalizeApiBase(parsed.apiBaseUrl || DEFAULT_API),
      token: parsed.token || undefined,
    };
  } catch {
    return { apiBaseUrl: DEFAULT_API };
  }
}

async function writeConfig(config: CliConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(
    CONFIG_PATH,
    JSON.stringify(
      {
        apiBaseUrl: normalizeApiBase(config.apiBaseUrl),
        token: config.token,
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
}

async function clearConfig(): Promise<void> {
  await fs.rm(CONFIG_PATH, { force: true });
}

async function apiRequest<T = JsonObject>(
  cfg: CliConfig,
  method: string,
  route: string,
  body?: JsonValue,
  requireAuth = true
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (requireAuth) {
    if (!cfg.token) {
      throw new Error('Not logged in. Run "tg auth login --token <token>".');
    }
    headers.Authorization = `Bearer ${cfg.token}`;
  }

  const res = await fetch(`${cfg.apiBaseUrl}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    data = ({ raw: text } as unknown) as T;
  }
  return { status: res.status, data };
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

function openInEditor(filePath: string): void {
  const editor = process.env.EDITOR || "nano";
  const res = spawnSync(editor, [filePath], { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`Editor exited with status ${res.status ?? 1}`);
  }
}

async function fetchMySites(cfg: CliConfig): Promise<SiteSummary[]> {
  const resp = await apiRequest<SiteSummary[]>(cfg, "GET", "/api/sites");
  ensureOk(resp.status, resp.data);
  return resp.data || [];
}

function printSites(items: SiteSummary[]): void {
  if (items.length === 0) {
    console.log("No sites.");
    return;
  }
  for (const s of items) {
    console.log(
      `${s.subdomain}.tiny.garden  |  ${s.channelTitle}  |  ${
        s.template
      }  |  ${s.published ? "published" : "draft"}`
    );
  }
}

async function resolveSiteId(cfg: CliConfig, siteArg: string): Promise<string> {
  const sites = await fetchMySites(cfg);
  const needle = normalizeSiteNeedle(siteArg);

  const directId = sites.find((s) => s.id === siteArg);
  if (directId) return directId.id;

  const exactSubdomain = sites.find((s) => s.subdomain.toLowerCase() === needle);
  if (exactSubdomain) return exactSubdomain.id;

  const partial = sites.filter((s) =>
    [s.subdomain, s.channelTitle, s.channelSlug]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  );
  if (partial.length === 1) return partial[0].id;
  if (partial.length > 1) {
    const labels = partial
      .slice(0, 5)
      .map((s) => `${s.subdomain} (${s.id})`)
      .join(", ");
    throw new Error(
      `Ambiguous site "${siteArg}". Matches: ${labels}${
        partial.length > 5 ? ", ..." : ""
      }`
    );
  }

  throw new Error(`Site not found: ${siteArg}`);
}

async function waitForBuild(
  cfg: CliConfig,
  siteId: string,
  timeoutSeconds: number
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutSeconds * 1000) {
    const sites = await fetchMySites(cfg);
    const site = sites.find((s) => s.id === siteId);
    if (!site) throw new Error("Site disappeared during polling.");
    if (site.published) {
      console.log(`Published: https://${site.subdomain}.tiny.garden`);
      return;
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("Timed out waiting for build.");
}

function collectAssetUrls(html: string, pageUrl: string): string[] {
  const refs = new Set<string>();
  const attrPattern = /(?:src|href)=["']([^"']+)["']/gi;
  const cssPattern = /url\((['"]?)([^)'"]+)\1\)/gi;
  const candidates: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(html)) !== null) candidates.push(match[1]);
  while ((match = cssPattern.exec(html)) !== null) candidates.push(match[2]);

  for (const raw of candidates) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("mailto:") ||
      trimmed.startsWith("javascript:")
    ) {
      continue;
    }
    try {
      const abs = new URL(trimmed, pageUrl);
      if (abs.protocol === "http:" || abs.protocol === "https:") {
        refs.add(abs.toString());
      }
    } catch {
      // Ignore unparsable refs.
    }
  }

  return [...refs];
}

async function mirrorBackupHtml(
  outDir: string,
  html: string,
  pageUrl: string
): Promise<string> {
  const assetDir = path.join(outDir, "assets");
  await fs.mkdir(assetDir, { recursive: true });

  const urls = collectAssetUrls(html, pageUrl);
  let rewritten = html;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const ext =
        path.extname(new URL(url).pathname) ||
        extensionFromContentType(res.headers.get("content-type"));
      const filename = `${shortHash(url)}${ext}`;
      const relPath = `assets/${filename}`;
      const absPath = path.join(assetDir, filename);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(absPath, buf);
      rewritten = rewritten.split(url).join(relPath);
    } catch {
      // Non-fatal: keep external URL untouched.
    }
  }

  const indexPath = path.join(outDir, "index.html");
  await fs.writeFile(indexPath, rewritten);
  return indexPath;
}

async function cmdAuthLogin(
  flags: Record<string, string | boolean>
): Promise<void> {
  const cfg = await readConfig();
  const apiBase =
    typeof flags.api === "string"
      ? normalizeApiBase(flags.api)
      : cfg.apiBaseUrl || DEFAULT_API;
  const token =
    typeof flags.token === "string"
      ? flags.token
      : await prompt("Paste API token: ");

  const verifyCfg: CliConfig = { apiBaseUrl: apiBase, token };
  const resp = await apiRequest(verifyCfg, "GET", "/api/account");
  ensureOk(resp.status, resp.data);
  await writeConfig(verifyCfg);
  const user = resp.data as { arenaUsername?: string };
  console.log(`Logged in as ${user.arenaUsername || "user"} at ${apiBase}`);
}

async function cmdAuthWhoami(): Promise<void> {
  const cfg = await readConfig();
  const resp = await apiRequest(cfg, "GET", "/api/account");
  ensureOk(resp.status, resp.data);
  const data = resp.data as {
    arenaUsername: string;
    plan: string;
    siteCount: number;
    isAdmin: boolean;
    isFriend: boolean;
  };
  console.log(`@${data.arenaUsername}`);
  console.log(`Plan: ${data.plan}`);
  console.log(`Sites: ${data.siteCount}`);
  if (data.isAdmin) console.log("Role: admin");
  else if (data.isFriend) console.log("Role: friend");
}

async function cmdAuthLogout(): Promise<void> {
  await clearConfig();
  console.log("Logged out.");
}

async function cmdSites(flags: Record<string, string | boolean>): Promise<void> {
  const cfg = await readConfig();
  const sites = await fetchMySites(cfg);
  const q = typeof flags.search === "string" ? flags.search.toLowerCase() : "";
  const items = sites.filter((s) =>
    !q
      ? true
      : [s.subdomain, s.channelTitle, s.template, s.channelSlug]
          .join(" ")
          .toLowerCase()
          .includes(q)
  );
  if (flags.json) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }
  printSites(items);
}

async function cmdSearch(
  command: string[],
  flags: Record<string, string | boolean>
): Promise<void> {
  const cfg = await readConfig();
  const query = command[1] || "";
  const scope = typeof flags.scope === "string" ? flags.scope : "all";
  const limit = typeof flags.limit === "string" ? flags.limit : "20";
  const route = `/api/sites/search?q=${encodeURIComponent(
    query
  )}&scope=${encodeURIComponent(scope)}&limit=${encodeURIComponent(limit)}`;
  const resp = await apiRequest<SearchResponse>(
    cfg,
    "GET",
    route,
    undefined,
    scope !== "public"
  );
  ensureOk(resp.status, resp.data);
  if (flags.json) {
    console.log(JSON.stringify(resp.data.items, null, 2));
    return;
  }
  for (const s of resp.data.items) {
    console.log(
      `${s.url}  |  ${s.channelTitle}  |  @${s.owner.arenaUsername}  |  ${s.template}`
    );
  }
}

async function pickFromList<T>(
  title: string,
  items: T[],
  label: (item: T, idx: number) => string
): Promise<T> {
  if (items.length === 0) throw new Error(`No options available for ${title}.`);
  console.log(title);
  items.forEach((item, idx) => {
    console.log(`${idx + 1}) ${label(item, idx)}`);
  });
  const raw = await prompt(`Choose [1-${items.length}]: `);
  const idx = Number(raw);
  if (!Number.isFinite(idx) || idx < 1 || idx > items.length) {
    throw new Error("Invalid selection.");
  }
  return items[idx - 1];
}

async function cmdNew(flags: Record<string, string | boolean>): Promise<void> {
  const cfg = await readConfig();
  let channelSlug = getFlagString(flags, "channel") || "";
  let channelTitle = channelSlug;

  if (!channelSlug) {
    const chResp = await apiRequest<Array<{ slug: string; title: string }>>(
      cfg,
      "GET",
      "/api/channels?source=own"
    );
    ensureOk(chResp.status, chResp.data);
    const picked = await pickFromList(
      "Channels",
      chResp.data,
      (ch) => `${ch.title} (${ch.slug})`
    );
    channelSlug = picked.slug;
    channelTitle = picked.title;
  }

  let template = getFlagString(flags, "template") || "";
  if (!template) {
    const tResp = await apiRequest<
      Array<{ id: string; name: string; description: string }>
    >(cfg, "GET", "/api/templates");
    ensureOk(tResp.status, tResp.data);
    const picked = await pickFromList(
      "Templates",
      tResp.data,
      (t) => `${t.name} (${t.id})`
    );
    template = picked.id;
  }

  let subdomain = getFlagString(flags, "subdomain") || "";
  if (!subdomain) {
    const suggested = channelSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const raw = await prompt(`Subdomain [${suggested}]: `);
    subdomain = (raw || suggested).toLowerCase().replace(/[^a-z0-9-]/g, "");
  }

  if (!flags.yes) {
    console.log(
      `Create site:\n  channel=${channelSlug}\n  template=${template}\n  subdomain=${subdomain}`
    );
    const ok = await prompt("Continue? [y/N]: ");
    if (!/^y(es)?$/i.test(ok)) {
      console.log("Cancelled.");
      return;
    }
  }

  const createResp = await apiRequest<SiteSummary>(cfg, "POST", "/api/sites", {
    channelSlug,
    channelTitle,
    template,
    subdomain,
  });
  ensureOk(createResp.status, createResp.data);
  const site = createResp.data;
  console.log(`Created ${site.subdomain}.tiny.garden (${site.id})`);

  if (flags.wait) {
    const timeout = getFlagNumber(flags, "timeout", 180);
    await waitForBuild(cfg, site.id, timeout);
  }
}

async function cmdRefresh(
  command: string[],
  flags: Record<string, string | boolean>
): Promise<void> {
  const siteArg = command[2];
  if (!siteArg) throw new Error("Usage: tg site refresh <site-id-or-subdomain>");
  const cfg = await readConfig();
  const siteId = await resolveSiteId(cfg, siteArg);
  const resp = await apiRequest(cfg, "POST", `/api/sites/${siteId}/build`, {});
  ensureOk(resp.status, resp.data);
  console.log("Rebuild requested.");
  if (flags.wait) {
    const timeout = getFlagNumber(flags, "timeout", 180);
    await waitForBuild(cfg, siteId, timeout);
  }
}

async function cmdThemeEdit(command: string[]): Promise<void> {
  const siteArg = command[3];
  if (!siteArg) throw new Error("Usage: tg site theme edit <site>");
  const cfg = await readConfig();
  const siteId = await resolveSiteId(cfg, siteArg);
  const resp = await apiRequest(cfg, "GET", `/api/sites/${siteId}/theme`);
  ensureOk(resp.status, resp.data);
  const tmp = path.join(os.tmpdir(), `tg-theme-${siteId}.json`);
  await fs.writeFile(tmp, JSON.stringify(resp.data, null, 2));
  openInEditor(tmp);
  const edited = JSON.parse(await fs.readFile(tmp, "utf-8")) as JsonObject;
  const put = await apiRequest(cfg, "PUT", `/api/sites/${siteId}/theme`, edited);
  ensureOk(put.status, put.data);
  console.log("Theme updated.");
}

async function cmdThemeSet(
  command: string[],
  flags: Record<string, string | boolean>
): Promise<void> {
  const siteArg = command[3];
  if (!siteArg) {
    throw new Error(
      "Usage: tg site theme set <site> --bg <hex> --text <hex> --accent <hex> --border <hex> --heading <font> --body <font>"
    );
  }
  const cfg = await readConfig();
  const siteId = await resolveSiteId(cfg, siteArg);
  const currentResp = await apiRequest<{
    colors: ThemeColors | null;
    fonts: ThemeFonts | null;
  }>(cfg, "GET", `/api/sites/${siteId}/theme`);
  ensureOk(currentResp.status, currentResp.data);

  const colors: ThemeColors = {
    ...(currentResp.data.colors || DEFAULT_THEME_COLORS),
  };
  const fonts: ThemeFonts = {
    ...(currentResp.data.fonts || DEFAULT_THEME_FONTS),
  };

  const bg = getFlagString(flags, "bg");
  const text = getFlagString(flags, "text");
  const accent = getFlagString(flags, "accent");
  const border = getFlagString(flags, "border");
  const heading = getFlagString(flags, "heading");
  const body = getFlagString(flags, "body");

  if (bg) {
    if (!isHexColor(bg)) throw new Error(`Invalid --bg color: ${bg}`);
    colors.background = bg;
  }
  if (text) {
    if (!isHexColor(text)) throw new Error(`Invalid --text color: ${text}`);
    colors.text = text;
  }
  if (accent) {
    if (!isHexColor(accent)) throw new Error(`Invalid --accent color: ${accent}`);
    colors.accent = accent;
  }
  if (border) {
    if (!isHexColor(border)) throw new Error(`Invalid --border color: ${border}`);
    colors.border = border;
  }
  if (heading) fonts.heading = heading;
  if (body) fonts.body = body;

  if (!bg && !text && !accent && !border && !heading && !body) {
    throw new Error(
      "No changes provided. Use one or more of --bg --text --accent --border --heading --body."
    );
  }

  const putBody: JsonObject = {
    colors: colors as unknown as JsonObject,
    fonts: fonts as unknown as JsonObject,
  };
  const put = await apiRequest(cfg, "PUT", `/api/sites/${siteId}/theme`, putBody);
  ensureOk(put.status, put.data);
  console.log("Theme updated.");
}

async function cmdCssEdit(command: string[]): Promise<void> {
  const siteArg = command[3];
  if (!siteArg) throw new Error("Usage: tg site css edit <site>");
  const cfg = await readConfig();
  const siteId = await resolveSiteId(cfg, siteArg);
  const resp = await apiRequest<{ css: string }>(cfg, "GET", `/api/sites/${siteId}/css`);
  ensureOk(resp.status, resp.data);
  const tmp = path.join(os.tmpdir(), `tg-css-${siteId}.css`);
  await fs.writeFile(tmp, resp.data.css || "");
  openInEditor(tmp);
  const css = await fs.readFile(tmp, "utf-8");
  const put = await apiRequest(cfg, "PUT", `/api/sites/${siteId}/css`, { css });
  ensureOk(put.status, put.data);
  console.log("CSS updated.");
}

async function cmdCssPush(
  command: string[],
  flags: Record<string, string | boolean>
): Promise<void> {
  const siteArg = command[3];
  const file = getFlagString(flags, "file") || "";
  if (!siteArg || !file) {
    throw new Error("Usage: tg site css push <site> --file <path>");
  }
  const cfg = await readConfig();
  const siteId = await resolveSiteId(cfg, siteArg);
  const css = await fs.readFile(path.resolve(file), "utf-8");
  const put = await apiRequest(cfg, "PUT", `/api/sites/${siteId}/css`, { css });
  ensureOk(put.status, put.data);
  console.log("CSS pushed.");
}

async function cmdCssPull(
  command: string[],
  flags: Record<string, string | boolean>
): Promise<void> {
  const siteArg = command[3];
  const outPath = getFlagString(flags, "out") || "";
  if (!siteArg || !outPath) {
    throw new Error("Usage: tg site css pull <site> --out <path>");
  }
  const cfg = await readConfig();
  const siteId = await resolveSiteId(cfg, siteArg);
  const resp = await apiRequest<{ css: string }>(cfg, "GET", `/api/sites/${siteId}/css`);
  ensureOk(resp.status, resp.data);
  const full = path.resolve(outPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, resp.data.css || "");
  console.log(`Saved ${full}`);
}

async function cmdBackup(
  command: string[],
  flags: Record<string, string | boolean>
): Promise<void> {
  const siteArg = command[3];
  const outDirRaw = getFlagString(flags, "out") || "";
  const mode = (getFlagString(flags, "mode") || "html").toLowerCase();
  if (!siteArg || !outDirRaw) {
    throw new Error("Usage: tg site backup <site> --out <directory> [--mode html|mirror]");
  }
  if (mode !== "html" && mode !== "mirror") {
    throw new Error(`Invalid --mode "${mode}". Expected "html" or "mirror".`);
  }

  const outDir = path.resolve(outDirRaw);
  const cfg = await readConfig();
  const siteId = await resolveSiteId(cfg, siteArg);
  const metaResp = await apiRequest<ExportResponse>(
    cfg,
    "GET",
    `/api/sites/${siteId}/export`
  );
  ensureOk(metaResp.status, metaResp.data);

  const htmlRes = await fetch(metaResp.data.url);
  if (!htmlRes.ok) {
    throw new Error(`Failed to fetch site HTML (${htmlRes.status})`);
  }
  const html = await htmlRes.text();

  await fs.mkdir(outDir, { recursive: true });
  const indexPath =
    mode === "mirror"
      ? await mirrorBackupHtml(outDir, html, metaResp.data.url)
      : path.join(outDir, "index.html");

  if (mode === "html") {
    await fs.writeFile(indexPath, html);
  }

  console.log(`Saved ${mode} backup to ${indexPath}`);
}

function printHelp(): void {
  console.log(`tg - tiny.garden CLI

Usage:
  tg auth login --token <token> [--api <url>]
  tg auth whoami
  tg auth logout

  tg sites [--search <query>] [--json]
  tg search <query> [--scope mine|public|all] [--limit <n>] [--json]
  tg new [--channel <slug>] [--template <slug>] [--subdomain <name>] [--wait] [--yes]

  tg site refresh <site> [--wait] [--timeout <seconds>]
  tg site theme edit <site>
  tg site theme set <site> [--bg <hex>] [--text <hex>] [--accent <hex>] [--border <hex>] [--heading <font>] [--body <font>]
  tg site css edit <site>
  tg site css push <site> --file <path>
  tg site css pull <site> --out <path>
  tg site backup <site> --out <dir> [--mode html|mirror]
`);
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (command.length === 0 || flags.help || flags.h) {
    printHelp();
    return;
  }

  if (command[0] === "auth" && command[1] === "login") return cmdAuthLogin(flags);
  if (command[0] === "auth" && command[1] === "whoami") return cmdAuthWhoami();
  if (command[0] === "auth" && command[1] === "logout") return cmdAuthLogout();

  if (command[0] === "sites") return cmdSites(flags);
  if (command[0] === "search") return cmdSearch(command, flags);
  if (command[0] === "new") return cmdNew(flags);

  if (command[0] === "site" && command[1] === "refresh") return cmdRefresh(command, flags);
  if (command[0] === "site" && command[1] === "theme" && command[2] === "edit") {
    return cmdThemeEdit(command);
  }
  if (command[0] === "site" && command[1] === "theme" && command[2] === "set") {
    return cmdThemeSet(command, flags);
  }
  if (command[0] === "site" && command[1] === "css" && command[2] === "edit") {
    return cmdCssEdit(command);
  }
  if (command[0] === "site" && command[1] === "css" && command[2] === "push") {
    return cmdCssPush(command, flags);
  }
  if (command[0] === "site" && command[1] === "css" && command[2] === "pull") {
    return cmdCssPull(command, flags);
  }
  if (command[0] === "site" && command[1] === "backup") return cmdBackup(command, flags);

  throw new Error(`Unknown command: ${command.join(" ")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

