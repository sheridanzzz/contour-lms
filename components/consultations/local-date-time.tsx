"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime } from "@/lib/consultations/datetime";

const noopSubscribe = () => () => {};

/**
 * Renders a UTC timestamp in the viewer's timezone. The server snapshot is
 * empty, so server and browser never disagree during hydration.
 */
export function LocalDateTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noopSubscribe,
    () => formatDateTime(new Date(iso)),
    () => null,
  );
  return (
    <time dateTime={iso} className="whitespace-nowrap">
      {text ?? " "}
    </time>
  );
}
