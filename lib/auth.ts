import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user for this request, or null.
 * getClaims() verifies the JWT; the role comes from the database via is_admin()
 * (the same function RLS uses), so a role change applies immediately.
 * cache() dedupes the lookups within one request.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  if (roleError) throw roleError;

  return {
    supabase,
    userId: data.claims.sub,
    email: data.claims.email as string | undefined,
    isAdmin: isAdmin === true,
  };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
