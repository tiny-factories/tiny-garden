// Umami event tracking helper
// Usage: track("site-published", { template: "blog", channel: "my-channel" })

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string | number>) => void;
    };
  }
}

export function track(event: string, data?: Record<string, string | number>) {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.track(event, data);
  }
}
