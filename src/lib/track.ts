// Umami event tracking (browser). Server events: src/lib/umami-server.ts

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
