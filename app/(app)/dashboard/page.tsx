import { Suspense } from "react";
import { BookConsultationDialog } from "@/components/consultations/book-consultation-dialog";
import { ConsultationList } from "@/components/consultations/consultation-list";
import { PageSkeleton } from "@/components/consultations/page-skeleton";
import { TableSkeleton } from "@/components/consultations/table-skeleton";
import { RoleGate } from "@/components/role-gate";

// The heading and Book button render after the role check (admins are sent to
// /admin first); the student's data then streams in behind the table skeleton.
export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RoleGate role="student">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">My consultations</h1>
              <p className="text-sm text-muted-foreground">
                Book, reschedule, cancel, and tick off your consultations.
              </p>
            </div>
            <BookConsultationDialog />
          </div>
          <Suspense fallback={<TableSkeleton />}>
            <ConsultationList searchParams={searchParams} mode="student" />
          </Suspense>
        </div>
      </RoleGate>
    </Suspense>
  );
}
