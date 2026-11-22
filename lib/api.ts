import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";
import { GENERIC_ERROR_MESSAGE, type ApiErrorBody, type ApiErrorCode, type FieldErrors } from "@/lib/api-types";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

// The API boundary: every route handler goes through these helpers, so errors
// are mapped to the shared JSON shape here and nowhere else.

export function apiError(status: number, code: ApiErrorCode, message: string, fields?: FieldErrors) {
  return NextResponse.json<ApiErrorBody>({ error: { code, message, fields } }, { status });
}

/**
 * Wraps a route handler so nothing escapes as Next's default HTML 500: expected
 * failures are returned by the handler, anything unexpected (Supabase
 * unreachable, a bug) is logged with context and answered in the shared shape.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const request = args[0] instanceof Request ? args[0] : undefined;
      console.error("Unhandled API error", request?.method, request?.url, error);
      return apiError(500, "internal_error", GENERIC_ERROR_MESSAGE);
    }
  };
}

export function validationError(error: z.ZodError) {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return apiError(
    400,
    "validation_error",
    formErrors[0] ?? "Please fix the highlighted fields",
    fieldErrors as FieldErrors,
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
      return apiError(500, "internal_error", GENERIC_ERROR_MESSAGE);
  }
}

/** The JSON body, or undefined when it isn't valid JSON (schema validation then answers 400). */
async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

type Parsed<T> = { data: T; response?: never } | { data?: never; response: NextResponse };

/** Validates any input against a schema: the parsed data, or a ready-made 400 response. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): Parsed<z.output<S>> {
  const result = schema.safeParse(input);
  return result.success ? { data: result.data } : { response: validationError(result.error) };
}

export const parseBody = async <S extends z.ZodType>(request: NextRequest, schema: S) =>
  parse(schema, await readJson(request));

export const parseQuery = <S extends z.ZodType>(request: NextRequest, schema: S) =>
  parse(schema, Object.fromEntries(request.nextUrl.searchParams));

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
    return {
      response: apiError(403, "forbidden", "Admins can view consultations but not book or change them"),
    };
  }
  return guard;
}
