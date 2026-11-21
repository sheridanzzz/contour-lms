import { createServerClient } from "@supabase/ssr";

export const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
// Demo accounts from supabase/seed.sql (local only).
const PASSWORD = "Password123!";

/** Signs in through Supabase Auth and returns the Cookie header the app reads. */
export async function signIn(email: string): Promise<string> {
  const jar = new Map<string, string>();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message} (run "npm run db:reset"?)`);
  // The session cookie is written via an auth event; give it a moment to land.
  for (let i = 0; i < 20 && ![...jar.keys()].some((k) => k.startsWith("sb-")); i++) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

type ApiOptions = { method?: string; cookie?: string; body?: unknown; rawBody?: string };

export async function api(path: string, { method = "GET", cookie, body, rawBody }: ApiOptions = {}) {
  const res = await fetch(BASE_URL + path, {
    method,
    redirect: "manual",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, body: (await res.json().catch(() => null)) as any };
}

/** Every row of a paginated list endpoint, following pages. */
export async function listAll(path: string, cookie: string) {
  const rows: { id: string; reason: string; status: string }[] = [];
  for (let page = 1; ; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await api(`${path}${sep}page=${page}&pageSize=100`, { cookie });
    if (res.status !== 200) throw new Error(`${path} -> ${res.status}`);
    rows.push(...res.body.data);
    if (page * 100 >= res.body.total) return rows;
  }
}

export const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
export const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
