"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateConsultationSchema } from "@/lib/consultations/schema";
import type { Consultation } from "@/lib/consultations/types";
import { DateTimePicker } from "./date-time-picker";
import { FormField } from "./form-field";
import { useUpdateConsultation } from "./use-update-consultation";

export function RescheduleDialog({ consultation }: { consultation: Consultation }) {
  const { busy, update } = useUpdateConsultation(consultation.id);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const fieldId = `reschedule-${consultation.id}`;

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const scheduledAt = new FormData(e.currentTarget).get("scheduledAt");
    const parsed = updateConsultationSchema.safeParse({ scheduledAt });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    const apiError = await update(parsed.data, "Consultation rescheduled");
    if (apiError) setError(apiError.fields.scheduledAt?.[0] ?? apiError.message);
    else setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule consultation</DialogTitle>
          <DialogDescription>{consultation.reason}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <FormField id={fieldId} label="New date and time" error={error}>
            <DateTimePicker
              id={fieldId}
              name="scheduledAt"
              defaultValue={new Date(consultation.scheduledAt)}
              error={error}
            />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
