import type { ApiErrorBody } from "@/lib/api";

// Browser-side caller for our /api routes. Turns the shared error shape into an ApiError.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

export async function callApi<T>(path: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (json as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, error?.message ?? "Something went wrong", error?.fields);
  }
  return json as T;
}
