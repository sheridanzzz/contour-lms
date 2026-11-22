import type { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import type {
  createConsultationSchema,
  listConsultationsQuerySchema,
  updateConsultationSchema,
} from "./schema";

// Consultation domain types, shared by the API, the service and the UI.
// Derived from the DB schema and the zod schemas, so they can't drift from either.

export type ConsultationStatus = Database["public"]["Enums"]["consultation_status"];

/** A consultation as the API returns it: camelCase, no owner id. */
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

export type Paginated<T> = { data: T[]; page: number; pageSize: number; total: number };

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;
export type ListConsultationsQuery = z.infer<typeof listConsultationsQuerySchema>;
