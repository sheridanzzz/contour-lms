import { listHref } from "@/lib/consultations/list-url";
import type { ConsultationStatus, Paginated } from "@/lib/consultations/types";
import { ListLink } from "./list-link";

export function Pagination({
  basePath,
  result,
  status,
}: {
  basePath: string;
  result: Paginated<unknown>;
  status?: ConsultationStatus;
}) {
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  // From a page past the end, "Previous" goes to the last real page.
  const previousPage = Math.min(result.page - 1, totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {result.total} total · page {result.page} of {totalPages}
      </span>
      <div className="flex gap-1">
        {result.page > 1 && <ListLink href={listHref(basePath, { status, page: previousPage })}>Previous</ListLink>}
        {result.page < totalPages && (
          <ListLink href={listHref(basePath, { status, page: result.page + 1 })}>Next</ListLink>
        )}
      </div>
    </nav>
  );
}
