import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useRole } from "@/context/RoleContext";
import type { Role } from "@/lib/mock-data";

export function RoleGuard({ allowed, children }: { allowed: Role[]; children: ReactNode }) {
  const { role } = useRole();
  if (!allowed.includes(role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
