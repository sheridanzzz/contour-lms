import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  toConsultation,
  type Consultation,
  type ConsultationStatus,
  type CreateConsultationInput,
  type ListConsultationsQuery,
  type Paginated,
  type UpdateConsultationInput,
} from "./schema";

// Data access for consultations. Used by API route handlers (writes) and
// Server Components (reads). Always called with the user-scoped client, so RLS
// applies to every query. Returns { data, error } like supabase-js.

type Client = SupabaseClient<Database>;
type Result<T> = { data: T; error: null } | { data: null; error: PostgrestError };

/**
 * studentId set: that student's consultations (dashboard).
 * studentId omitted: every consultation the caller may read (admin view; RLS
 * returns all rows only for admins, callers also check the role explicitly).
 */
export async function listConsultations(
  supabase: Client,
  { status, page, pageSize, studentId }: ListConsultationsQuery & { studentId?: string },
): Promise<Result<Paginated<Consultation>>> {
  const from = (page - 1) * pageSize;
  const filters: { student_id?: string; status?: ConsultationStatus } = {};
  if (studentId) filters.student_id = studentId;
  if (status) filters.status = status;

  // ponytail: offset pagination with an exact count; switch to keyset
  // pagination on (scheduled_at, id) if the table grows to millions of rows.
  const { data, error, count } = await supabase
    .from("consultations")
    .select("*", { count: "exact" })
    .match(filters)
    .order("scheduled_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + pageSize - 1);

  // A page past the end makes PostgREST answer 416 (PGRST103) with no count.
  // That is an empty page, not a failure; fetch the real total for the pager.
  if (error?.code === "PGRST103") {
    const { count: total, error: countError } = await supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .match(filters);
    if (countError) return { data: null, error: countError };
    return { data: { data: [], page, pageSize, total: total ?? 0 }, error: null };
  }
  if (error) return { data: null, error };
  return {
    data: { data: data.map(toConsultation), page, pageSize, total: count ?? 0 },
    error: null,
  };
}

export async function createConsultation(
  supabase: Client,
  input: CreateConsultationInput,
): Promise<Result<Consultation>> {
  // student_id and status are DB defaults (auth.uid(), 'booked'); the client
  // has no insert grant on them.
  const { data, error } = await supabase
    .from("consultations")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      reason: input.reason,
      scheduled_at: input.scheduledAt,
    })
    .select()
    .single();
  if (error) return { data: null, error };
  return { data: toConsultation(data), error: null };
}

/** Returns data: null with no error when the row does not exist or is not the caller's. */
export async function updateConsultation(
  supabase: Client,
  { id, studentId, patch }: { id: string; studentId: string; patch: UpdateConsultationInput },
): Promise<Result<Consultation | null>> {
  const { data, error } = await supabase
    .from("consultations")
    .update({ scheduled_at: patch.scheduledAt, status: patch.status })
    .eq("id", id)
    .eq("student_id", studentId)
    .select()
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? toConsultation(data) : null, error: null };
}
