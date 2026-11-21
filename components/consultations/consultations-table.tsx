import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  consultationStatuses,
  type Consultation,
  type ConsultationStatus,
  type Paginated,
} from "@/lib/consultations/schema";
import { cn } from "@/lib/utils";
import { CompleteToggle, ConsultationActions } from "./consultation-actions";
import { LocalDateTime } from "./local-date-time";

const statusLabel: Record<ConsultationStatus, string> = {
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
};
const statusVariant: Record<ConsultationStatus, "default" | "secondary" | "outline"> = {
  booked: "default",
  completed: "secondary",
  cancelled: "outline",
};

/** One table for both views: "student" adds the complete toggle and actions, "admin" is read-only. */
export function ConsultationsTable({
  consultations,
  mode,
}: {
  consultations: Consultation[];
  mode: "student" | "admin";
}) {
  if (consultations.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {mode === "student"
          ? "No consultations here yet. Use “Book consultation” to create one."
          : "No consultations match this filter."}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {mode === "student" && <TableHead className="w-12">Done</TableHead>}
          <TableHead>{mode === "admin" ? "Student" : "Name"}</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>When</TableHead>
          <TableHead>Status</TableHead>
          {mode === "admin" && <TableHead>Booked</TableHead>}
          {mode === "student" && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {consultations.map((c) => (
          <TableRow key={c.id} className={cn(c.status === "cancelled" && "text-muted-foreground")}>
            {mode === "student" && (
              <TableCell>
                <CompleteToggle consultation={c} />
              </TableCell>
            )}
            <TableCell className="font-medium">
              {c.firstName} {c.lastName}
            </TableCell>
            <TableCell className="max-w-xs truncate" title={c.reason}>
              {c.reason}
            </TableCell>
            <TableCell>
              <LocalDateTime iso={c.scheduledAt} />
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
            </TableCell>
            {mode === "admin" && (
              <TableCell>
                <LocalDateTime iso={c.createdAt} />
              </TableCell>
            )}
            {mode === "student" && (
              <TableCell>
                <ConsultationActions consultation={c} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Filter and pagination are plain links, so list state lives in the URL.
function listHref(basePath: string, params: { status?: ConsultationStatus; page?: number }) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const linkClass = (active: boolean) =>
  cn(
    "rounded-md px-3 py-1.5 text-sm",
    active ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground",
  );

export function StatusFilter({ basePath, status }: { basePath: string; status?: ConsultationStatus }) {
  const options: { label: string; value?: ConsultationStatus }[] = [
    { label: "All" },
    ...consultationStatuses.map((value) => ({ label: statusLabel[value], value })),
  ];
  return (
    <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
      {options.map(({ label, value }) => (
        <Link
          key={label}
          href={listHref(basePath, { status: value })}
          className={linkClass(status === value)}
          aria-current={status === value ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Pagination({
  basePath,
  result,
  status,
}: {
  basePath: string;
  result: Paginated<Consultation>;
  status?: ConsultationStatus;
}) {
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {result.total} total · page {result.page} of {totalPages}
      </span>
      <div className="flex gap-1">
        {result.page > 1 && (
          <Link href={listHref(basePath, { status, page: Math.min(result.page - 1, totalPages) })} className={linkClass(false)}>
            Previous
          </Link>
        )}
        {result.page < totalPages && (
          <Link href={listHref(basePath, { status, page: result.page + 1 })} className={linkClass(false)}>
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}

export function TableSkeleton() {
  return (
    <div className="grid gap-2" aria-busy="true" aria-label="Loading consultations">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
