import Link from "next/link";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-5">
          <Link href="/" className="font-semibold">
            Contour Consultations
          </Link>
          <Suspense>
            <UserNav />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-5">{children}</main>
    </div>
  );
}

async function UserNav() {
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
