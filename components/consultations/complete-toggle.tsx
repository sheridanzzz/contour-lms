"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { canToggleComplete } from "@/lib/consultations/rules";
import type { Consultation } from "@/lib/consultations/types";
import { useUpdateConsultation } from "./use-update-consultation";

/** Booked <-> completed. Cancelled is final, so its box is disabled (the DB enforces it too). */
export function CompleteToggle({ consultation }: { consultation: Consultation }) {
  const { busy, update } = useUpdateConsultation(consultation.id);
  const completed = consultation.status === "completed";

  return (
    <Checkbox
      checked={completed}
      disabled={busy || !canToggleComplete(consultation.status)}
      aria-label={completed ? "Mark as incomplete" : "Mark as complete"}
      onCheckedChange={(checked) =>
        update(
          { status: checked ? "completed" : "booked" },
          checked ? "Marked as complete" : "Marked as incomplete",
        )
      }
    />
  );
}
