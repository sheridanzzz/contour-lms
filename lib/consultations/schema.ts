import { z } from "zod";
import { Constants, type Tables } from "@/lib/supabase/database.types";

// Shared by the booking form (client) and the API (server) so validation never drifts.
// The database enforces the same rules again (check constraints + trigger).

export const consultationStatuses = Constants.public.Enums.consultation_status;
export type ConsultationStatus = (typeof consultationStatuses)[number];

const name = z.string().trim().min(1, "Required").max(100, "Must be 100 characters or fewer");

const futureDateTime = z.iso
  .datetime({ offset: true, message: "Choose a date and time" })
  .refine((value) => new Date(value).getTime() > Date.now(), "Choose a time in the future");

export const createConsultationSchema = z.strictObject({
  firstName: name,
  lastName: name,
  reason: z.string().trim().min(1, "Required").max(1000, "Must be 1000 characters or fewer"),
  scheduledAt: futureDateTime,
});
export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;

// One change per request keeps each action atomic and easy to reason about:
// { scheduledAt } reschedules, { status } completes / reopens / cancels.
export const updateConsultationSchema = z
  .strictObject({
    scheduledAt: futureDateTime.optional(),
    status: z.enum(consultationStatuses).optional(),
  })
  .refine(
    (body) => (body.scheduledAt === undefined) !== (body.status === undefined),
    "Provide either scheduledAt or status",
  );
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;

export const listConsultationsQuerySchema = z.object({
  status: z.enum(consultationStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListConsultationsQuery = z.infer<typeof listConsultationsQuerySchema>;

export const consultationIdSchema = z.uuid("Invalid consultation id");

// API shape: camelCase, independent of the DB column names.
export type Consultation = {
  id: string;
  firstName: string;
  lastName: string;
  reason: string;
  scheduledAt: string;
  status: ConsultationStatus;
  createdAt: string;
  updatedAt: string;
};

export function toConsultation(row: Tables<"consultations">): Consultation {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    reason: row.reason,
    scheduledAt: row.scheduled_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type Paginated<T> = { data: T[]; page: number; pageSize: number; total: number };
