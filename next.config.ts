import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static shells prerender, user data streams in (see the Suspense boundaries in pages).
  cacheComponents: true,
  // `partialPrefetching` is deliberately left unset (Next prints a notice about it in dev).
  // Setting it, even to false, made Next 16.4 prerender the session-dependent header
  // during prefetch, which errored on the auth check and stopped pages hydrating.
};

export default nextConfig;
