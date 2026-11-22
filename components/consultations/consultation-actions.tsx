import { canCancel, canReschedule } from "@/lib/consultations/rules";
import type { Consultation } from "@/lib/consultations/types";
import { CancelDialog } from "./cancel-dialog";
import { RescheduleDialog } from "./reschedule-dialog";

/** Row actions, offered only where the status rules allow them (the DB enforces them too). */
export function ConsultationActions({ consultation }: { consultation: Consultation }) {
  const { status } = consultation;
  if (!canReschedule(status) && !canCancel(status)) return null;
  return (
    <div className="flex justify-end gap-2">
      {canReschedule(status) && <RescheduleDialog consultation={consultation} />}
      {canCancel(status) && <CancelDialog consultation={consultation} />}
    </div>
  );
}
