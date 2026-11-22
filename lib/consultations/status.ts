import type { ConsultationStatus } from "./types";

/** Display label for each status, shared by the status badge and the status filter. */
export const statusLabel: Record<ConsultationStatus, string> = {
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
};
