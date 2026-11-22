import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** Sends each user to the home view for their role (or to login). Renders nothing. */
export async function RoleRedirect(): Promise<null> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  redirect(user.isAdmin ? "/admin" : "/dashboard");
  return null;
}
