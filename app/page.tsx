import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";

// Entry point: send each user to the view for their role.
export default function Home() {
  return (
    <Suspense>
      <RoleRedirect />
    </Suspense>
  );
}

async function RoleRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  redirect(user.isAdmin ? "/admin" : "/dashboard");
  return null;
}
