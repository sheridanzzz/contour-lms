import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "./table-skeleton";

/** Whole-page placeholder while the role check runs: a generic heading, then the table. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <TableSkeleton />
    </div>
  );
}
