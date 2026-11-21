import { listConsultationsQuerySchema } from "@/lib/consultations/schema";
import { listConsultations } from "@/lib/consultations/service";
import type { CurrentUser } from "@/lib/auth";
import { ConsultationsTable, Pagination, StatusFilter } from "./consultations-table";

/**
 * Server-rendered, URL-driven list shared by the student dashboard and the admin view.
 * Reads go straight through the service (no extra HTTP hop); writes go through /api.
 */
export async function ConsultationList({
  user,
  searchParams,
  mode,
}: {
  user: CurrentUser;
  searchParams: Record<string, string | string[] | undefined>;
  mode: "student" | "admin";
}) {
  const parsed = listConsultationsQuerySchema.safeParse(searchParams);
  const query = parsed.success ? parsed.data : listConsultationsQuerySchema.parse({});
  const basePath = mode === "admin" ? "/admin" : "/dashboard";

  const { data, error } = await listConsultations(user.supabase, {
    ...query,
    // Students: filter to their own rows explicitly rather than relying on RLS alone.
    studentId: mode === "student" ? user.userId : undefined,
  });
  if (error) throw new Error(error.message);

  return (
    <div className="flex flex-col gap-4">
      <StatusFilter basePath={basePath} status={query.status} />
      <ConsultationsTable consultations={data.data} mode={mode} />
      <Pagination basePath={basePath} result={data} status={query.status} />
    </div>
  );
}
