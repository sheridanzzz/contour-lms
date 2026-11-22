import "server-only";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user for this request, or null when nobody is signed in.
 * getClaims() verifies the JWT; the role comes from the database via is_admin()
 * (the same function RLS uses), so a role change applies immediately.
 * Throws when Supabase can't be reached, so an outage surfaces as a 500
 * instead of being mistaken for "signed out". cache() dedupes per request.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error && isAuthRetryableFetchError(error)) throw error;
  if (error || !data?.claims) return null; // no session, or an invalid/expired token

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  if (roleError) throw new Error(`Role lookup failed: ${roleError.message}`);

  return {
    supabase,
    userId: data.claims.sub,
    email: data.claims.email as string | undefined,
    isAdmin: isAdmin === true,
  };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * Page-side role routing (the API equivalent is requireStudent/requireAdmin).
 * Signed out -> login. Students on admin pages -> 404, so the page isn't
 * advertised. Admins on student pages -> their own view, since admins don't book.
 */
export async function requirePageRole(role: "student" | "admin"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (role === "admin" && !user.isAdmin) notFound();
  if (role === "student" && user.isAdmin) redirect("/admin");
  return user;
}
