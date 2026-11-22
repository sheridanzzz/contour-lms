"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  combineDateAndTime,
  formatDay,
  formatTime,
  timeSlots,
  toTimeValue,
} from "@/lib/consultations/datetime";
import { cn } from "@/lib/utils";
import { errorProps } from "./form-field";

/**
 * Calendar + time slot picker. The combined value is submitted as an ISO 8601
 * UTC string through a hidden input, so forms read it like any other field.
 * Only mounts inside an open dialog, so `new Date()` never runs during prerender.
 */
export function DateTimePicker({
  id,
  name,
  defaultValue,
  error,
}: {
  id: string;
  name: string;
  defaultValue?: Date;
  error?: string;
}) {
  const [now] = useState(() => new Date());
  const [day, setDay] = useState<Date | undefined>(defaultValue);
  const [time, setTime] = useState(() => (defaultValue ? toTimeValue(defaultValue) : ""));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const slots = day ? timeSlots(day, now) : [];
  // A time that is no longer offered (e.g. after picking today) is dropped, not kept stale.
  const selectedTime = slots.includes(time) ? time : "";
  const value = day && selectedTime ? combineDateAndTime(day, selectedTime).toISOString() : "";

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("justify-start font-normal", !day && "text-muted-foreground")}
            {...errorProps(id, error)}
          >
            <CalendarIcon />
            {day ? formatDay(day) : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <DayPicker
            mode="single"
            selected={day}
            onSelect={(selected) => {
              setDay(selected);
              setCalendarOpen(false);
            }}
            disabled={{ before: today }}
            startMonth={today}
            defaultMonth={day ?? today}
          />
        </PopoverContent>
      </Popover>

      <Select value={selectedTime} onValueChange={setTime} disabled={slots.length === 0}>
        <SelectTrigger aria-label="Time" {...errorProps(id, error)}>
          <SelectValue placeholder={day && slots.length === 0 ? "No times left" : "Time"} />
        </SelectTrigger>
        <SelectContent>
          {day &&
            slots.map((slot) => (
              <SelectItem key={slot} value={slot}>
                {formatTime(combineDateAndTime(day, slot))}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <input type="hidden" name={name} value={value} />
    </div>
  );
}
