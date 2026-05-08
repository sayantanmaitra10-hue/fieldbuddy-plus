import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { Role } from "@/lib/mock-data";

interface RoleViewCtx {
  assignedRoles: Role[];
  availableRoles: Role[];
  activeRole: Role;
  canSwitch: boolean;
  setActiveRole: (r: Role) => void;
}

const STORAGE_KEY = "fieldops:active-role";
const ALL_ROLES: Role[] = ["field", "manager", "admin"];

const Ctx = createContext<RoleViewCtx>({
  assignedRoles: ALL_ROLES,
  availableRoles: ALL_ROLES,
  activeRole: "field",
  canSwitch: true,
  setActiveRole: () => {},
});

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const availableRoles = useMemo<Role[]>(() => ALL_ROLES, []);

  const [activeRole, setActiveRoleState] = useState<Role>(() => {
    if (typeof window === "undefined") return "field";
    const stored = window.localStorage.getItem(STORAGE_KEY) as Role | null;
    return stored && ALL_ROLES.includes(stored) ? stored : "field";
  });

  useEffect(() => {
    if (!availableRoles.includes(activeRole)) {
      setActiveRoleState(availableRoles[0]);
    }
  }, [availableRoles, activeRole]);

  const setActiveRole = (r: Role) => {
    if (!availableRoles.includes(r)) return;
    setActiveRoleState(r);
    try {
      window.localStorage.setItem(STORAGE_KEY, r);
    } catch {
      /* ignore */
    }
  };

  return (
    <Ctx.Provider
      value={{
        assignedRoles: availableRoles,
        availableRoles,
        activeRole,
        canSwitch: availableRoles.length > 1,
        setActiveRole,
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
