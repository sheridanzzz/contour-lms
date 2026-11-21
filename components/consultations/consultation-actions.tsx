"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateConsultationSchema, type Consultation } from "@/lib/consultations/schema";
import { DateTimePicker } from "./date-time-picker";
import { FormField } from "./form-field";
import { useUpdateConsultation } from "./use-update-consultation";

// UI mirrors the DB rules: booked <-> completed, booked -> cancelled (final),
// reschedule only while booked. The API/DB stay the source of truth.

export function CompleteToggle({ consultation }: { consultation: Consultation }) {
  const { busy, update } = useUpdateConsultation(consultation.id);
  const completed = consultation.status === "completed";

  return (
    <Checkbox
      checked={completed}
      disabled={busy || consultation.status === "cancelled"}
      aria-label={completed ? "Mark as incomplete" : "Mark as complete"}
      onCheckedChange={(checked) =>
        update(
          { status: checked ? "completed" : "booked" },
          checked ? "Marked as complete" : "Marked as incomplete",
        )
      }
    />
  );
}

export function ConsultationActions({ consultation }: { consultation: Consultation }) {
  if (consultation.status !== "booked") return null;
  return (
    <div className="flex justify-end gap-2">
      <RescheduleDialog consultation={consultation} />
      <CancelDialog consultation={consultation} />
    </div>
  );
}

function RescheduleDialog({ consultation }: { consultation: Consultation }) {
  const { busy, update } = useUpdateConsultation(consultation.id);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();

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
          <FormField id={`reschedule-${consultation.id}`} label="New date and time" error={error}>
            <DateTimePicker
              id={`reschedule-${consultation.id}`}
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

function CancelDialog({ consultation }: { consultation: Consultation }) {
  const { busy, update } = useUpdateConsultation(consultation.id);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive">
          Cancel
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this consultation?</AlertDialogTitle>
          <AlertDialogDescription>
            This can&apos;t be undone. You can book a new consultation at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={() => update({ status: "cancelled" }, "Consultation cancelled")}
          >
            Cancel consultation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
