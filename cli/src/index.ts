#!/usr/bin/env node
import fs from "fs/promises";
import os from "os";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { spawnSync } from "child_process";

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

const DEFAULT_API = "https://tiny.garden";
const CONFIG_DIR = path.join(os.homedir(), ".config", "tiny-garden");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

function normalizeApiBase(url: string): string {
  return url.replace(/\/+$/, "");
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
    JSON.stringify({ apiBaseUrl: normalizeApiBase(config.apiBaseUrl), token: config.token }, null, 2),
    { mode: 0o600 }
  );
}

async function clearConfig(): Promise<void> {
  await fs.rm(CONFIG_PATH, { force: true });
}

function parseArgs(argv: string[]): { command: string[]; flags: Record<string, string | boolean> } {
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

async function apiRequest<T = JsonObject>(
  cfg: CliConfig,
  method: string,
  route: string,
  body?: JsonValue,
  requireAuth = true
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (requireAuth) {
    if (!cfg.token) throw new Error("Not logged in. Run `tg auth login --token <token>`.");
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

function ensureOk(status: number, data: unknown): void {
  if (status >= 200 && status < 300) return;
  const payload = data as { error?: string; code?: string };
  throw new Error(payload.error || `Request failed (${status})${payload.code ? ` [${payload.code}]` : ""}`);
}

async function cmdAuthLogin(flags: Record<string, string | boolean>): Promise<void> {
  const cfg = await readConfig();
  const apiBase = typeof flags.api === "string" ? normalizeApiBase(flags.api) : cfg.apiBaseUrl || DEFAULT_API;
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

function printSites(items: SiteSummary[]): void {
  if (items.length === 0) {
    console.log("No sites.");
    return;
  }
  for (const s of items) {
    console.log(
      `${s.subdomain}.tiny.garden  |  ${s.channelTitle}  |  ${s.template}  |  ${s.published ? "published" : "draft"}`
    );
  }
}

async function cmdSites(flags: Record<string, string | boolean>): Promise<void> {
  const cfg = await readConfig();
  const resp = await apiRequest<SiteSummary[]>(cfg, "GET", "/api/sites");
  ensureOk(resp.status, resp.data);
  const q = typeof flags.search === "string" ? flags.search.toLowerCase() : "";
  const items = (resp.data || []).filter((s) =>
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

async function cmdSearch(command: string[], flags: Record<string, string | boolean>): Promise<void> {
  const cfg = await readConfig();
  const query = command[1] || "";
  const scope = typeof flags.scope === "string" ? flags.scope : "all";
  const limit = typeof flags.limit === "string" ? flags.limit : "20";
  const route = `/api/sites/search?q=${encodeURIComponent(query)}&scope=${encodeURIComponent(
    scope
  )}&limit=${encodeURIComponent(limit)}`;
  const resp = await apiRequest(cfg, "GET", route, undefined, scope !== "public");
  ensureOk(resp.status, resp.data);
  const data = resp.data as {
    items: Array<
      SiteSummary & {
        owner: { arenaUsername: string; isSelf: boolean };
        url: string;
      }
    >;
  };
  if (flags.json) {
    console.log(JSON.stringify(data.items, null, 2));
    return;
  }
  for (const s of data.items) {
    console.log(`${s.url}  |  ${s.channelTitle}  |  @${s.owner.arenaUsername}  |  ${s.template}`);
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
  let channelSlug = typeof flags.channel === "string" ? flags.channel : "";
  let channelTitle = channelSlug;
  if (!channelSlug) {
    const chResp = await apiRequest<Array<{ slug: string; title: string }>>(
      cfg,
      "GET",
      "/api/channels?source=own"
    );
    ensureOk(chResp.status, chResp.data);
    const picked = await pickFromList("Channels", chResp.data, (ch) => `${ch.title} (${ch.slug})`);
    channelSlug = picked.slug;
    channelTitle = picked.title;
  }

  let template = typeof flags.template === "string" ? flags.template : "";
  if (!template) {
    const tResp = await apiRequest<Array<{ id: string; name: string; description: string }>>(
      cfg,
      "GET",
      "/api/templates"
    );
    ensureOk(tResp.status, tResp.data);
    const picked = await pickFromList("Templates", tResp.data, (t) => `${t.name} (${t.id})`);
    template = picked.id;
  }

  let subdomain = typeof flags.subdomain === "string" ? flags.subdomain : "";
  if (!subdomain) {
    const suggested = channelSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const raw = await prompt(`Subdomain [${suggested}]: `);
    subdomain = (raw || suggested).toLowerCase().replace(/[^a-z0-9-]/g, "");
  }

  if (!flags.yes) {
    console.log(`Create site:\n  channel=${channelSlug}\n  template=${template}\n  subdomain=${subdomain}`);
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
  const site = createResp.data as SiteSummary;
  console.log(`Created ${site.subdomain}.tiny.garden (${site.id})`);

  if (flags.wait) {
    await waitForBuild(cfg, site.id, Number(flags.timeout || 180));
  }
}

async function waitForBuild(cfg: CliConfig, siteId: string, timeoutSeconds: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutSeconds * 1000) {
    const resp = await apiRequest<SiteSummary[]>(cfg, "GET", "/api/sites");
    ensureOk(resp.status, resp.data);
    const site = resp.data.find((s) => s.id === siteId);
    if (!site) throw new Error("Site disappeared during polling.");
    if (site.published) {
      console.log(`Published: https://${site.subdomain}.tiny.garden`);
      return;
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("Timed out waiting for build.");
}

async function resolveSiteId(cfg: CliConfig, siteArg: string): Promise<string> {
  const resp = await apiRequest<SiteSummary[]>(cfg, "GET", "/api/sites");
  ensureOk(resp.status, resp.data);
  const direct = resp.data.find((s) => s.id === siteArg || s.subdomain === siteArg);
  if (direct) return direct.id;
  throw new Error(`Site not found: ${siteArg}`);
}

async function cmdRefresh(command: string[], flags: Record<string, string | boolean>): Promise<void> {
  const siteArg = command[2];
  if (!siteArg) throw new Error("Usage: tg site refresh <site-id-or-subdomain>");
  const cfg = await readConfig();
  const siteId = await resolveSiteId(cfg, siteArg);
  const resp = await apiRequest(cfg, "POST", `/api/sites/${siteId}/build`, {});
  ensureOk(resp.status, resp.data);
  console.log("Rebuild requested.");
  if (flags.wait) {
    await waitForBuild(cfg, siteId, Number(flags.timeout || 180));
  }
}

function openInEditor(filePath: string): void {
  const editor = process.env.EDITOR || "nano";
  const res = spawnSync(editor, [filePath], { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`Editor exited with status ${res.status ?? 1}`);
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

async function cmdCssPush(command: string[], flags: Record<string, string | boolean>): Promise<void> {
  const siteArg = command[3];
  const file = typeof flags.file === "string" ? flags.file : "";
  if (!siteArg || !file) throw new Error("Usage: tg site css push <site> --file <path>");
  const cfg = await readConfig();
  const siteId = await resolveSiteId(cfg, siteArg);
  const css = await fs.readFile(path.resolve(file), "utf-8");
  const put = await apiRequest(cfg, "PUT", `/api/sites/${siteId}/css`, { css });
  ensureOk(put.status, put.data);
  console.log("CSS pushed.");
}

async function cmdCssPull(command: string[], flags: Record<string, string | boolean>): Promise<void> {
  const siteArg = command[3];
  const outPath = typeof flags.out === "string" ? flags.out : "";
  if (!siteArg || !outPath) throw new Error("Usage: tg site css pull <site> --out <path>");
  const cfg = await readConfig();
  const siteId = await resolveSiteId(cfg, siteArg);
  const resp = await apiRequest<{ css: string }>(cfg, "GET", `/api/sites/${siteId}/css`);
  ensureOk(resp.status, resp.data);
  const full = path.resolve(outPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, resp.data.css || "");
  console.log(`Saved ${full}`);
}

async function cmdBackup(command: string[], flags: Record<string, string | boolean>): Promise<void> {
  const siteArg = command[3];
  const outDir = typeof flags.out === "string" ? path.resolve(flags.out) : "";
  if (!siteArg || !outDir) throw new Error("Usage: tg site backup <site> --out <directory>");
  const cfg = await readConfig();
  const siteId = await resolveSiteId(cfg, siteArg);
  const metaResp = await apiRequest<{ url: string; subdomain: string }>(
    cfg,
    "GET",
    `/api/sites/${siteId}/export`
  );
  ensureOk(metaResp.status, metaResp.data);
  const htmlRes = await fetch(metaResp.data.url);
  if (!htmlRes.ok) throw new Error(`Failed to fetch site HTML (${htmlRes.status})`);
  const html = await htmlRes.text();
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "index.html"), html);
  console.log(`Saved backup to ${path.join(outDir, "index.html")}`);
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
  tg site css edit <site>
  tg site css push <site> --file <path>
  tg site css pull <site> --out <path>
  tg site backup <site> --out <dir>
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
  if (command[0] === "site" && command[1] === "theme" && command[2] === "edit") return cmdThemeEdit(command);
  if (command[0] === "site" && command[1] === "css" && command[2] === "edit") return cmdCssEdit(command);
  if (command[0] === "site" && command[1] === "css" && command[2] === "push") return cmdCssPush(command, flags);
  if (command[0] === "site" && command[1] === "css" && command[2] === "pull") return cmdCssPull(command, flags);
  if (command[0] === "site" && command[1] === "backup") return cmdBackup(command, flags);

  throw new Error(`Unknown command: ${command.join(" ")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

