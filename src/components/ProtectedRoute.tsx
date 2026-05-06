import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import type { Role } from "@/lib/mock-data";
import { Loader2 } from "lucide-react";

type Props = {
  children: ReactNode;
  requireRole?: Role;
};

export const ProtectedRoute = ({ children, requireRole }: Props) => {
  const { session, roles, loading } = useAuth();
  const { availableRoles } = useRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;

  // Permission gate: allow if user has the real role, is admin, or has the role
  // available in their current view layer (demo: every signed-in user can preview both).
  if (
    requireRole &&
    !roles.includes(requireRole) &&
    !roles.includes("admin") &&
    !availableRoles.includes(requireRole)
  ) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
