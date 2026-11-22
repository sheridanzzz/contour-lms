import type { ConsultationStatus } from "./types";

// What the UI offers for each status. Mirrors the database trigger
// (enforce_consultation_rules), which stays authoritative: these helpers only
// decide which controls to show, so the rules live in one place on each side.
//   booked <-> completed, booked -> cancelled (final), reschedule only while booked.

export const canToggleComplete = (status: ConsultationStatus) => status !== "cancelled";
export const canReschedule = (status: ConsultationStatus) => status === "booked";
export const canCancel = (status: ConsultationStatus) => status === "booked";
export const isCancelled = (status: ConsultationStatus) => status === "cancelled";
