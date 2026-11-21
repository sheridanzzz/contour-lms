// Fail fast with a clear message instead of 50 confusing fetch errors.
export default async function setup() {
  const base = process.env.API_BASE_URL ?? "http://localhost:3000";
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const appUp = await fetch(`${base}/auth/login`).then((r) => r.ok, () => false);
  if (!appUp) throw new Error(`App not reachable at ${base}. Run "npm run dev" first.`);

  const dbUp = supabase && (await fetch(`${supabase}/auth/v1/health`).then((r) => r.status < 500, () => false));
  if (!dbUp) throw new Error(`Supabase not reachable at ${supabase}. Run "npm run db:start" first.`);
}
