import Link from "next/link";
import { cn } from "@/lib/utils";

/** A filter or pagination link; `active` marks the current page for styling and screen readers. */
export function ListLink({
  href,
  active = false,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm",
        active ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
