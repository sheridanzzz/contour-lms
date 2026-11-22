import type { ConsultationStatus } from "./types";

/**
 * URL for a consultation list view. Filter and pagination are plain links, so
 * list state lives in the URL (shareable, back-button friendly, no client state).
 */
export function listHref(basePath: string, params: { status?: ConsultationStatus; page?: number }) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
