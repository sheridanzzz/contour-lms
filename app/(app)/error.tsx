"use client";

import { Button } from "@/components/ui/button";

// Shown if loading data fails. Details stay in the server logs.
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-md border p-6">
      <p className="text-sm">Something went wrong loading this page.</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
