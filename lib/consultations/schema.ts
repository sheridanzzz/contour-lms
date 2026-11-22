import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";

// Request validation, shared by the booking form (client) and the API (server)
// so the rules never drift. The database enforces them again (check
// constraints + trigger). Types inferred from these live in ./types.ts.

/** Status values come from the generated DB enum, never a hand-written list. */
export const consultationStatuses = Constants.public.Enums.consultation_status;

/** Field and paging limits. Text limits match the DB check constraints; the form reuses them. */
export const consultationLimits = { name: 100, reason: 1000, pageSize: 20, maxPageSize: 100 } as const;

const name = z
  .string()
  .trim()
  .min(1, "Required")
  .max(consultationLimits.name, `Must be ${consultationLimits.name} characters or fewer`);

const futureDateTime = z.iso
  .datetime({ offset: true, message: "Choose a date and time" })
  // NaN (unparseable) is left to the format check above, so there is one message, not two.
  .refine((value) => {
    const time = new Date(value).getTime();
    return Number.isNaN(time) || time > Date.now();
  }, "Choose a time in the future");

export const createConsultationSchema = z.strictObject({
  firstName: name,
  lastName: name,
  reason: z
    .string()
    .trim()
    .min(1, "Required")
    .max(consultationLimits.reason, `Must be ${consultationLimits.reason} characters or fewer`),
  scheduledAt: futureDateTime,
});

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

export const listConsultationsQuerySchema = z.object({
  status: z.enum(consultationStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(consultationLimits.maxPageSize).default(consultationLimits.pageSize),
});

export const consultationIdSchema = z.uuid("Invalid consultation id");
