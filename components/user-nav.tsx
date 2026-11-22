import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";

/** Header navigation: one home link per role, who you are, and logout. */
export async function UserNav() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <nav className="flex items-center gap-4 text-sm">
      {user.isAdmin ? (
        <Link href="/admin" className="hover:underline">
          All consultations
        </Link>
      ) : (
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
      )}
      <span className="hidden items-center gap-2 text-muted-foreground sm:flex">
        {user.email}
        <Badge variant="outline">{user.isAdmin ? "Admin" : "Student"}</Badge>
      </span>
      <LogoutButton />
    </nav>
  );
}
