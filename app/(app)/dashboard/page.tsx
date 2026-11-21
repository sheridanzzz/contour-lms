import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BookConsultationDialog } from "@/components/consultations/book-consultation-dialog";
import { ConsultationList } from "@/components/consultations/consultation-list";
import { TableSkeleton } from "@/components/consultations/consultations-table";
import { getCurrentUser } from "@/lib/auth";

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
        <StudentConsultations searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function StudentConsultations({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  // Admins oversee and don't book: their home is the admin view.
  if (user.isAdmin) redirect("/admin");
  return <ConsultationList user={user} searchParams={await searchParams} mode="student" />;
}
