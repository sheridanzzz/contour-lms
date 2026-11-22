import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/consultations/status";
import type { ConsultationStatus } from "@/lib/consultations/types";

const variant: Record<ConsultationStatus, "default" | "secondary" | "outline"> = {
  booked: "default",
  completed: "secondary",
  cancelled: "outline",
};

export function StatusBadge({ status }: { status: ConsultationStatus }) {
  return <Badge variant={variant[status]}>{statusLabel[status]}</Badge>;
}
