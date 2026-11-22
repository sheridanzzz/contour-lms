import { Suspense } from "react";
import { BookConsultationDialog } from "@/components/consultations/book-consultation-dialog";
import { ConsultationList } from "@/components/consultations/consultation-list";
import { TableSkeleton } from "@/components/consultations/table-skeleton";

// Static shell renders instantly; the student's data streams in behind the skeleton.
export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
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
  );
}
