/**
 * Fire custom events from the server (Stripe webhooks, etc.) via Umami v3 POST /api/send.
 * @see https://umami.is/docs/api/sending-stats
 */

function umamiSendUrl(): string | null {
  const scriptUrl =
    process.env.NEXT_PUBLIC_UMAMI_URL || "https://cloud.umami.is/script.js";
  try {
    const u = new URL(scriptUrl);
    return new URL("/api/send", `${u.protocol}//${u.host}`).toString();
  } catch {
    return null;
  }
}

function appHostname(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tiny.garden";
  try {
    return new URL(appUrl).hostname;
  } catch {
    return "tiny.garden";
  }
}

export async function sendUmamiServerEvent(
  name: string,
  data?: Record<string, string | number>
): Promise<void> {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const sendUrl = umamiSendUrl();
  if (!websiteId || !sendUrl) return;

  const payload = {
    type: "event" as const,
    payload: {
      hostname: appHostname(),
      language: "en-US",
      referrer: "",
      screen: "",
      title: "server",
      url: "/",
      website: websiteId,
      name,
      ...(data && Object.keys(data).length > 0 ? { data } : {}),
    },
  };

  try {
    await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "tiny-garden/1.0",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Umami server event failed:", name, err);
  }
}
