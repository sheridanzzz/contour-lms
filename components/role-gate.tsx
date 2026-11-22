import type { ReactNode } from "react";
import { requirePageRole } from "@/lib/auth";

/**
 * Renders its children only for the given role; everyone else is sent away by
 * requirePageRole. Wrap it in Suspense so the prerendered static shell holds
 * nothing role-specific (a student never sees the admin heading, an admin never
 * sees the Book button).
 */
export async function RoleGate({ role, children }: { role: "student" | "admin"; children: ReactNode }) {
  await requirePageRole(role);
  return children;
}
