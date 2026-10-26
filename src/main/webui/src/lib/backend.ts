// Where the backend is. Served by Quarkus (Quinoa) the ui talks to its own origin, so urls stay relative.
// In the desktop app Tauri serves the ui (tauri://localhost) and injects the backend's origin before the page loads.

declare global {
  interface Window {
    __HMC_BACKEND__?: string
  }
}

export function backendOrigin(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.__HMC_BACKEND__
}

/** Resolves a backend path like `/api/info` against the backend's origin, if the ui is not served by it. */
export function backendUrl(path: string, origin: string | undefined = backendOrigin()): string {
  return origin ? origin.replace(/\/+$/, '') + path : path
}
