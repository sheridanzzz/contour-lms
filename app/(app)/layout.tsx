import Link from "next/link";
import { Suspense } from "react";
import { UserNav } from "@/components/user-nav";

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
