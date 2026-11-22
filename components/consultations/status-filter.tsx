import { listHref } from "@/lib/consultations/list-url";
import { consultationStatuses } from "@/lib/consultations/schema";
import { statusLabel } from "@/lib/consultations/status";
import type { ConsultationStatus } from "@/lib/consultations/types";
import { ListLink } from "./list-link";

export function StatusFilter({ basePath, status }: { basePath: string; status?: ConsultationStatus }) {
  return (
    <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
      <ListLink href={listHref(basePath, {})} active={!status}>
        All
      </ListLink>
      {consultationStatuses.map((value) => (
        <ListLink key={value} href={listHref(basePath, { status: value })} active={status === value}>
          {statusLabel[value]}
        </ListLink>
      ))}
    </nav>
  );
}
