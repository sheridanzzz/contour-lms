import { Suspense } from "react";
import { ConsultationList } from "@/components/consultations/consultation-list";
import { PageSkeleton } from "@/components/consultations/page-skeleton";
import { TableSkeleton } from "@/components/consultations/table-skeleton";
import { RoleGate } from "@/components/role-gate";

// Everything here sits behind RoleGate, so non-admins get a 404 without ever
// seeing this page's heading; the static shell is just the skeleton.
export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RoleGate role="admin">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold">All consultations</h1>
            <p className="text-sm text-muted-foreground">Read-only view of every booking in the system.</p>
          </div>
          <Suspense fallback={<TableSkeleton />}>
            <ConsultationList searchParams={searchParams} mode="admin" />
          </Suspense>
        </div>
      </RoleGate>
    </Suspense>
  );
}
