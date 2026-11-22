import { Suspense } from "react";
import { RoleRedirect } from "@/components/role-redirect";

// Entry point: send each user to the view for their role.
export default function Home() {
  return (
    <Suspense>
      <RoleRedirect />
    </Suspense>
  );
}
