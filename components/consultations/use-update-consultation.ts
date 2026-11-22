"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { callApi, type ApiError } from "@/lib/consultations/api-client";
import type { Consultation, UpdateConsultationInput } from "@/lib/consultations/types";

/** PATCH /api/consultations/:id, toast the outcome, refresh the server-rendered list. Returns the error, if any. */
export function useUpdateConsultation(id: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function update(body: UpdateConsultationInput, successMessage: string): Promise<ApiError | null> {
    setBusy(true);
    const { error } = await callApi<{ data: Consultation }>(`/api/consultations/${id}`, "PATCH", body);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success(successMessage);
    // Refresh on failure too: a 404/409 usually means this row changed elsewhere.
    router.refresh();
    return error;
  }

  return { busy, update };
}
