import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isCancelled } from "@/lib/consultations/rules";
import type { Consultation } from "@/lib/consultations/types";
import { cn } from "@/lib/utils";
import { CompleteToggle } from "./complete-toggle";
import { ConsultationActions } from "./consultation-actions";
import { LocalDateTime } from "./local-date-time";
import { StatusBadge } from "./status-badge";

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
          <TableRow key={c.id} className={cn(isCancelled(c.status) && "text-muted-foreground")}>
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
              <StatusBadge status={c.status} />
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
