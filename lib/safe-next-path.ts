/**
 * A `?next=` redirect target as a same-origin path, or "/" when it is missing or
 * points anywhere else. Resolving it with the URL parser (rather than checking
 * for a leading "/") also catches tricks like `//evil.com`, `/\evil.com` and
 * embedded tabs, which browsers treat as another host.
 */
export function safeNextPath(next: string | null, origin: string): string {
  if (!next) return "/";
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}
