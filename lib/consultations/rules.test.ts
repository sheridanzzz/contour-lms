import { describe, expect, it } from "vitest";
import { canCancel, canReschedule, canToggleComplete, isCancelled } from "./rules";

// Same matrix as the pgTAP transition tests, so the UI never offers what the DB refuses.
describe.each([
  ["booked", { toggle: true, reschedule: true, cancel: true, cancelled: false }],
  ["completed", { toggle: true, reschedule: false, cancel: false, cancelled: false }],
  ["cancelled", { toggle: false, reschedule: false, cancel: false, cancelled: true }],
] as const)("a %s consultation", (status, expected) => {
  it("offers exactly the allowed actions", () => {
    expect({
      toggle: canToggleComplete(status),
      reschedule: canReschedule(status),
      cancel: canCancel(status),
      cancelled: isCancelled(status),
    }).toEqual(expected);
  });
});
