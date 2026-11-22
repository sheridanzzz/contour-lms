// The HTTP error contract, shared by the API (server) and its browser client.
// Every API error has the same shape: { error: { code, message, fields? } }.

export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "internal_error";

/** Shown when nothing more specific can be said (server 500s, unreadable replies). */
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** Per-field validation messages, keyed by request field name. */
export type FieldErrors = Record<string, string[]>;

export type ApiErrorBody = {
  error: { code: ApiErrorCode; message: string; fields?: FieldErrors };
};
