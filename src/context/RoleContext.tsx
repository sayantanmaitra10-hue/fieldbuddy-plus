import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Role } from "@/lib/mock-data";
import { useAuth } from "@/context/AuthContext";

interface RoleViewCtx {
  assignedRoles: Role[];
  availableRoles: Role[];
  activeRole: Role;
  canSwitch: boolean;
  setActiveRole: (role: Role) => void;
}

const Ctx = createContext<RoleViewCtx>({
  assignedRoles: [],
  availableRoles: [],
  activeRole: "field",
  canSwitch: false,
  setActiveRole: () => undefined,
});

const toAppRole = (role?: string): Role => {
  if (role === "org_admin" || role === "hr_admin") return "admin";
  if (role === "manager" || role === "supervisor") return "manager";
  return "field";
};

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const { activeMembership } = useAuth();
  const activeRole = toAppRole(activeMembership?.member_role);
  const assignedRoles = useMemo<Role[]>(
    () => (activeMembership ? [activeRole] : []),
    [activeMembership, activeRole],
  );

  return (
    <Ctx.Provider
      value={{
        assignedRoles,
        availableRoles: assignedRoles,
        activeRole,
        canSwitch: false,
        setActiveRole: () => undefined,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(Ctx);
  return {
    role: ctx.activeRole,
    setRole: ctx.setActiveRole,
    availableRoles: ctx.availableRoles,
    assignedRoles: ctx.assignedRoles,
    canSwitch: ctx.canSwitch,
  };
};
