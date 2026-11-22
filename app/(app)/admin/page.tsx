import { Suspense } from "react";
import { ConsultationList } from "@/components/consultations/consultation-list";
import { TableSkeleton } from "@/components/consultations/table-skeleton";

// The role check happens in ConsultationList (requirePageRole): non-admins get a 404.
export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">All consultations</h1>
        <p className="text-sm text-muted-foreground">Read-only view of every booking in the system.</p>
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <ConsultationList searchParams={searchParams} mode="admin" />
      </Suspense>
    </div>
  );
}
