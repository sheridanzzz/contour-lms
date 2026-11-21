import { describe, expect, it } from "vitest";
import { combineDateAndTime, timeSlots, toTimeValue } from "./datetime";
import {
  createConsultationSchema,
  listConsultationsQuerySchema,
  updateConsultationSchema,
} from "./schema";

const future = () => new Date(Date.now() + 86_400_000).toISOString();
const past = () => new Date(Date.now() - 60_000).toISOString();
const valid = () => ({ firstName: "Ann", lastName: "Lee", reason: "Maths", scheduledAt: future() });

describe("createConsultationSchema", () => {
  it("accepts a valid booking and trims text", () => {
    const result = createConsultationSchema.parse({ ...valid(), firstName: "  Ann  " });
    expect(result.firstName).toBe("Ann");
  });

  it("rejects a time in the past", () => {
    const result = createConsultationSchema.safeParse({ ...valid(), scheduledAt: past() });
    expect(result.success).toBe(false);
  });

  it("rejects blank and over-long fields", () => {
    expect(createConsultationSchema.safeParse({ ...valid(), lastName: "   " }).success).toBe(false);
    expect(createConsultationSchema.safeParse({ ...valid(), reason: "x".repeat(1001) }).success).toBe(false);
  });

  it("rejects fields the client must not set", () => {
    expect(createConsultationSchema.safeParse({ ...valid(), status: "completed" }).success).toBe(false);
    expect(createConsultationSchema.safeParse({ ...valid(), studentId: crypto.randomUUID() }).success).toBe(false);
  });
});

describe("updateConsultationSchema", () => {
  it("accepts exactly one change", () => {
    expect(updateConsultationSchema.safeParse({ status: "cancelled" }).success).toBe(true);
    expect(updateConsultationSchema.safeParse({ scheduledAt: future() }).success).toBe(true);
  });

  it("rejects none, both, or unknown statuses", () => {
    expect(updateConsultationSchema.safeParse({}).success).toBe(false);
    expect(updateConsultationSchema.safeParse({ status: "booked", scheduledAt: future() }).success).toBe(false);
    expect(updateConsultationSchema.safeParse({ status: "deleted" }).success).toBe(false);
  });
});

describe("listConsultationsQuerySchema", () => {
  it("applies defaults and coerces query strings", () => {
    expect(listConsultationsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(listConsultationsQuerySchema.parse({ page: "3", pageSize: "50" })).toMatchObject({ page: 3, pageSize: 50 });
  });

  it("caps the page size", () => {
    expect(listConsultationsQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
  });
});

describe("time slot helpers", () => {
  const day = new Date(2030, 4, 1); // 1 May 2030, local time

  it("offers 30-minute slots from 7am to 9pm", () => {
    const slots = timeSlots(day, new Date(2030, 0, 1));
    expect(slots[0]).toBe("07:00");
    expect(slots.at(-1)).toBe("21:00");
    expect(slots).toHaveLength(29);
  });

  it("drops slots that are not in the future", () => {
    expect(timeSlots(day, new Date(2030, 4, 1, 20, 30))).toEqual(["21:00"]);
    expect(timeSlots(day, new Date(2030, 4, 2))).toEqual([]);
  });

  it("combines a day and a slot into a local time", () => {
    const result = combineDateAndTime(day, "09:30");
    expect(toTimeValue(result)).toBe("09:30");
    expect(result.getDate()).toBe(1);
  });
});
