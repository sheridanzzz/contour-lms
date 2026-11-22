"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FieldErrors } from "@/lib/api-types";
import { callApi } from "@/lib/consultations/api-client";
import { consultationLimits, createConsultationSchema } from "@/lib/consultations/schema";
import type { Consultation } from "@/lib/consultations/types";
import { DateTimePicker } from "./date-time-picker";
import { errorProps, FormField } from "./form-field";

export function BookConsultationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Same schema as the API: instant feedback here, authoritative check there.
    const parsed = createConsultationSchema.safeParse({
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      reason: form.get("reason"),
      scheduledAt: form.get("scheduledAt"),
    });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors as FieldErrors);
      setFormError(null);
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);
    const { error } = await callApi<{ data: Consultation }>("/api/consultations", "POST", parsed.data);
    setPending(false);
    if (error) {
      setErrors(error.fields);
      setFormError(error.message);
      return;
    }
    toast.success("Consultation booked");
    setOpen(false);
    router.refresh();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setErrors({});
      setFormError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Book consultation</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book a consultation</DialogTitle>
          <DialogDescription>Times are in your local timezone.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="firstName" label="First name" error={errors.firstName?.[0]}>
              <Input id="firstName" name="firstName" autoComplete="given-name" maxLength={consultationLimits.name} {...errorProps("firstName", errors.firstName?.[0])} />
            </FormField>
            <FormField id="lastName" label="Last name" error={errors.lastName?.[0]}>
              <Input id="lastName" name="lastName" autoComplete="family-name" maxLength={consultationLimits.name} {...errorProps("lastName", errors.lastName?.[0])} />
            </FormField>
          </div>
          <FormField id="reason" label="Reason for consultation" error={errors.reason?.[0]}>
            <Textarea id="reason" name="reason" rows={3} maxLength={consultationLimits.reason} {...errorProps("reason", errors.reason?.[0])} />
          </FormField>
          <FormField id="scheduledAt" label="Date and time" error={errors.scheduledAt?.[0]}>
            <DateTimePicker id="scheduledAt" name="scheduledAt" error={errors.scheduledAt?.[0]} />
          </FormField>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Booking..." : "Book consultation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
