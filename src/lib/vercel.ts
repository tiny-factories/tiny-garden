const VERCEL_API = "https://api.vercel.com";

function getToken(): string {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("VERCEL_API_TOKEN is not set");
  return token;
}

function getProjectId(): string {
  const id = process.env.VERCEL_PROJECT_ID;
  if (!id) throw new Error("VERCEL_PROJECT_ID is not set");
  return id;
}

function teamParam(): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `&teamId=${teamId}` : "";
}

async function vercelFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${VERCEL_API}${path}${path.includes("?") ? "&" : "?"}${teamParam().replace("&", "")}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export interface VercelDomainResponse {
  name: string;
  apexName: string;
  verified: boolean;
  verification?: { type: string; domain: string; value: string; reason: string }[];
}

export interface VercelDomainConfig {
  configuredBy: string | null;
  misconfigured: boolean;
  cnames: string[];
  aValues: string[];
}

export async function addDomainToVercel(domain: string): Promise<VercelDomainResponse> {
  const res = await vercelFetch(`/v10/projects/${getProjectId()}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("This domain is already configured on another Vercel project. Remove it there first.");
    }
    throw new Error(data.error?.message || `Failed to add domain: ${res.status}`);
  }

  return data;
}

export async function removeDomainFromVercel(domain: string): Promise<void> {
  const res = await vercelFetch(`/v10/projects/${getProjectId()}/domains/${domain}`, {
    method: "DELETE",
  });

  if (!res.ok && res.status !== 404) {
    const data = await res.json();
    throw new Error(data.error?.message || `Failed to remove domain: ${res.status}`);
  }
}

export async function getProjectDomain(domain: string): Promise<VercelDomainResponse> {
  const res = await vercelFetch(`/v10/projects/${getProjectId()}/domains/${domain}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to get domain: ${res.status}`);
  }

  return data;
}

export async function getDomainConfig(domain: string): Promise<VercelDomainConfig> {
  const res = await vercelFetch(`/v6/domains/${domain}/config`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to get domain config: ${res.status}`);
  }

  return data;
}
