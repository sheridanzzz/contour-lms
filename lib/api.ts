import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

// Every API error has the same shape: { error: { code, message, fields? } }.
export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "internal_error";

export type ApiErrorBody = {
  error: { code: ApiErrorCode; message: string; fields?: Record<string, string[]> };
};

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string[]>,
) {
  return NextResponse.json<ApiErrorBody>({ error: { code, message, fields } }, { status });
}

export function validationError(error: z.ZodError) {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return apiError(
    400,
    "validation_error",
    formErrors[0] ?? "Please fix the highlighted fields",
    fieldErrors as Record<string, string[]>,
  );
}

/** Maps database errors (incl. our trigger's custom SQLSTATEs) to HTTP responses. */
export function dbError(error: PostgrestError) {
  switch (error.code) {
    case "PT400": // trigger: invalid input, e.g. date not in the future
    case "23514": // check constraint
      return apiError(400, "validation_error", error.message);
    case "PT409": // trigger: invalid status transition
      return apiError(409, "conflict", error.message);
    case "42501": // missing privilege / RLS rejection
      return apiError(403, "forbidden", "You do not have permission to do that");
    default:
      console.error("Unexpected database error", error);
      return apiError(500, "internal_error", "Something went wrong");
  }
}

export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined; // fails schema validation -> 400
  }
}

type Guard = { user: CurrentUser; response?: never } | { user?: never; response: NextResponse };

export async function requireUser(): Promise<Guard> {
  const user = await getCurrentUser();
  if (!user) return { response: apiError(401, "unauthorized", "Sign in to continue") };
  return { user };
}

// RLS already limits what a non-admin can read; this check gives the correct
// 403 instead of silently returning only the caller's own rows.
export async function requireAdmin(): Promise<Guard> {
  const guard = await requireUser();
  if (guard.response) return guard;
  if (!guard.user.isAdmin) return { response: apiError(403, "forbidden", "Admins only") };
  return guard;
}

// Booking endpoints are for students. Admins read everything via the admin API
// and write nothing; RLS enforces the same rule in the database.
export async function requireStudent(): Promise<Guard> {
  const guard = await requireUser();
  if (guard.response) return guard;
  if (guard.user.isAdmin) {
    return { response: apiError(403, "forbidden", "Admins can view consultations but not book or change them") };
  }
  return guard;
}
