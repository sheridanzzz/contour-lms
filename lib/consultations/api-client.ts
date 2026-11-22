import { GENERIC_ERROR_MESSAGE, type ApiErrorBody, type FieldErrors } from "@/lib/api-types";

// Browser-side boundary for our /api routes. Every failure (network down,
// non-JSON reply, HTTP error) becomes an ApiError here, and the result comes
// back as { data, error } like the server-side service, so components branch
// on `error` instead of wrapping calls in try/catch.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: FieldErrors = {},
  ) {
    super(message);
  }
}

export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

export async function callApi<T>(
  path: string,
  method: "POST" | "PATCH",
  body: unknown,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { data: null, error: new ApiError(0, "Can't reach the server. Check your connection and try again.") };
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok || json === null) {
    const error = (json as ApiErrorBody | null)?.error;
    return {
      data: null,
      error: new ApiError(res.status, error?.message ?? GENERIC_ERROR_MESSAGE, error?.fields),
    };
  }
  return { data: json as T, error: null };
}
