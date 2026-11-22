import { requirePageRole } from "@/lib/auth";
import { listConsultationsQuerySchema } from "@/lib/consultations/schema";
import { listConsultations } from "@/lib/consultations/service";
import { ConsultationsTable } from "./consultations-table";
import { Pagination } from "./pagination";
import { StatusFilter } from "./status-filter";

/**
 * Server-rendered, URL-driven list shared by the student dashboard and the admin view.
 * Checks the role itself, reads straight through the service (no extra HTTP
 * hop; writes go through /api), and handles a failed read here, at the data
 * boundary, with an inline message rather than crashing the page.
 */
export async function ConsultationList({
  searchParams,
  mode,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  mode: "student" | "admin";
}) {
  const user = await requirePageRole(mode);
  const parsed = listConsultationsQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : listConsultationsQuerySchema.parse({});
  const basePath = mode === "admin" ? "/admin" : "/dashboard";

  const { data, error } = await listConsultations(user.supabase, {
    ...query,
    // Students: filter to their own rows explicitly rather than relying on RLS alone.
    studentId: mode === "student" ? user.userId : undefined,
  });
  if (error) {
    console.error("Failed to load consultations", { mode, error });
    return (
      <p role="alert" className="rounded-md border border-destructive/50 p-4 text-sm text-destructive">
        We couldn&apos;t load consultations right now. Please refresh the page to try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <StatusFilter basePath={basePath} status={query.status} />
      <ConsultationsTable consultations={data.data} mode={mode} />
      <Pagination basePath={basePath} result={data} status={query.status} />
    </div>
  );
}
