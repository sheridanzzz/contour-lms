"use client";

import { useSyncExternalStore } from "react";

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const noopSubscribe = () => () => {};

/**
 * Renders a UTC timestamp in the viewer's timezone. The server snapshot is
 * empty, so server and browser never disagree during hydration.
 */
export function LocalDateTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noopSubscribe,
    () => formatter.format(new Date(iso)),
    () => null,
  );
  return (
    <time dateTime={iso} className="whitespace-nowrap">
      {text ?? " "}
    </time>
  );
}
