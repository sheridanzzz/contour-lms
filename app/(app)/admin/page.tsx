import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ConsultationList } from "@/components/consultations/consultation-list";
import { TableSkeleton } from "@/components/consultations/consultations-table";
import { getCurrentUser } from "@/lib/auth";

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <AdminConsultations searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminConsultations({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  // Non-admins get a 404 so the page's existence isn't advertised. RLS would
  // only show them their own rows anyway; this keeps the UX honest.
  if (!user.isAdmin) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">All consultations</h1>
        <p className="text-sm text-muted-foreground">Read-only view of every booking in the system.</p>
      </div>
      <ConsultationList user={user} searchParams={await searchParams} mode="admin" />
    </div>
  );
}
