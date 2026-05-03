import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { Role } from "@/lib/mock-data";
import { useAuth } from "@/context/AuthContext";

/**
 * Role view layer.
 *
 * - `assignedRoles`  → roles the user actually has (source of truth, from auth/DB).
 * - `availableRoles` → roles they're allowed to "view as" (admin sees all).
 * - `activeRole`     → which role's UI is currently rendered.
 *
 * Switching the view NEVER changes permissions — it only filters what the UI shows.
 * A field-only user can't sneak into manager view by flipping a toggle.
 */
interface RoleViewCtx {
  assignedRoles: Role[];
  availableRoles: Role[];
  activeRole: Role;
  canSwitch: boolean;
  setActiveRole: (r: Role) => void;
}

const Ctx = createContext<RoleViewCtx>({
  assignedRoles: [],
  availableRoles: ["field"],
  activeRole: "field",
  canSwitch: false,
  setActiveRole: () => {},
});

const STORAGE_KEY = "fieldops:active-role";
const ALL_ROLES: Role[] = ["field", "manager"];

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const { roles: assignedRoles, loading } = useAuth();

  // Admins can view both field & manager surfaces. Otherwise only the roles they hold.
  const availableRoles = useMemo<Role[]>(() => {
    if ((assignedRoles as string[]).includes("admin")) return ALL_ROLES;
    const allowed = ALL_ROLES.filter((r) => assignedRoles.includes(r));
    return allowed.length > 0 ? allowed : ["field"];
  }, [assignedRoles]);

  const [activeRole, setActiveRoleState] = useState<Role>(() => {
    if (typeof window === "undefined") return "field";
    const stored = window.localStorage.getItem(STORAGE_KEY) as Role | null;
    return stored ?? "field";
  });

  // Reconcile active role whenever the user's real roles change (login, role grant, etc.).
  useEffect(() => {
    if (loading) return;
    if (!availableRoles.includes(activeRole)) {
      setActiveRoleState(availableRoles[0]);
    }
  }, [availableRoles, activeRole, loading]);

  const setActiveRole = (r: Role) => {
    if (!availableRoles.includes(r)) return; // hard guard
    setActiveRoleState(r);
    try {
      window.localStorage.setItem(STORAGE_KEY, r);
    } catch {
      /* ignore */
    }
  };

  const canSwitch = availableRoles.length > 1;

  return (
    <Ctx.Provider value={{ assignedRoles, availableRoles, activeRole, canSwitch, setActiveRole }}>
      {children}
    </Ctx.Provider>
  );
};

/**
 * Backwards-compatible hook.
 * `role` is the active VIEW (use for UI filtering).
 * For real permission checks, use `useAuth().roles` instead.
 */
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
