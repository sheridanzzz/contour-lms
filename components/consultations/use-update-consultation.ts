"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, callApi } from "@/lib/consultations/api-client";
import type { UpdateConsultationInput } from "@/lib/consultations/schema";

/** PATCH /api/consultations/:id, then refresh the server-rendered list. Returns the error, if any. */
export function useUpdateConsultation(id: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function update(body: UpdateConsultationInput, successMessage: string) {
    setBusy(true);
    try {
      await callApi(`/api/consultations/${id}`, "PATCH", body);
      toast.success(successMessage);
      return null;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "Something went wrong");
      toast.error(apiError.message);
      return apiError;
    } finally {
      setBusy(false);
      // Refresh on failure too: a 404/409 usually means this row changed elsewhere.
      router.refresh();
    }
  }

  return { busy, update };
}
