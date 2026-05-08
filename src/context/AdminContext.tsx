import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { employees as seedEmployees, type Employee } from "@/lib/mock-data";

export type MemberRole = "field" | "manager" | "admin";

export interface TeamMember extends Employee {
  appRole: MemberRole;
}

export interface AuditEntry {
  id: string;
  time: string; // ISO
  actor: string; // who performed (admin name)
  action: string; // human readable
  targetId?: string;
  targetName?: string;
}

interface AdminCtx {
  members: TeamMember[];
  addMember: (input: { name: string; role: string; appRole: MemberRole; location?: string }) => TeamMember;
  setMemberRole: (id: string, appRole: MemberRole) => void;
  removeMember: (id: string) => void;

  impersonatedId: string | null;
  impersonatedMember: TeamMember | null;
  startImpersonation: (memberId: string) => void;
  stopImpersonation: () => void;

  auditLog: AuditEntry[];
  log: (action: string, target?: { id?: string; name?: string }) => void;
}

const ADMIN_NAME = "Arjun Mehta"; // mock signed-in admin
const STORAGE_MEMBERS = "fieldops:members";
const STORAGE_AUDIT = "fieldops:audit";
const STORAGE_IMP = "fieldops:impersonated";

const Ctx = createContext<AdminCtx | null>(null);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || "??";

const seedMembers: TeamMember[] = seedEmployees.map((e, i) => ({
  ...e,
  appRole: i === 0 ? "admin" : i === 1 ? "manager" : "field",
}));

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [members, setMembers] = useState<TeamMember[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_MEMBERS) : null;
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return seedMembers;
  });

  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_AUDIT) : null;
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  });

  const [impersonatedId, setImpersonatedId] = useState<string | null>(() => {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_IMP) : null;
    } catch { return null; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_MEMBERS, JSON.stringify(members)); } catch { /* ignore */ }
  }, [members]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_AUDIT, JSON.stringify(auditLog.slice(-200))); } catch { /* ignore */ }
  }, [auditLog]);
  useEffect(() => {
    try {
      if (impersonatedId) window.localStorage.setItem(STORAGE_IMP, impersonatedId);
      else window.localStorage.removeItem(STORAGE_IMP);
    } catch { /* ignore */ }
  }, [impersonatedId]);

  const log = useCallback<AdminCtx["log"]>((action, target) => {
    setAuditLog((prev) => [
      ...prev,
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: new Date().toISOString(),
        actor: ADMIN_NAME,
        action,
        targetId: target?.id,
        targetName: target?.name,
      },
    ]);
  }, []);

  const addMember: AdminCtx["addMember"] = useCallback((input) => {
    const id = `e-${Date.now().toString(36)}`;
    const m: TeamMember = {
      id,
      name: input.name,
      role: input.role,
      avatar: initials(input.name),
      checkedIn: false,
      zone: "n/a",
      lastActivity: "Just added",
      tasksAssigned: 0,
      tasksCompleted: 0,
      location: input.location ?? "—",
      appRole: input.appRole,
    };
    setMembers((prev) => [...prev, m]);
    log(`Added member ${input.name} as ${input.appRole}`, { id, name: input.name });
    return m;
  }, [log]);

  const setMemberRole: AdminCtx["setMemberRole"] = useCallback((id, appRole) => {
    setMembers((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target) log(`Changed role of ${target.name} → ${appRole}`, { id, name: target.name });
      return prev.map((m) => (m.id === id ? { ...m, appRole } : m));
    });
  }, [log]);

  const removeMember: AdminCtx["removeMember"] = useCallback((id) => {
    setMembers((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target) log(`Removed member ${target.name}`, { id, name: target.name });
      return prev.filter((m) => m.id !== id);
    });
  }, [log]);

  const startImpersonation: AdminCtx["startImpersonation"] = useCallback((memberId) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;
    setImpersonatedId(memberId);
    log(`Started impersonating ${target.name}`, { id: memberId, name: target.name });
  }, [members, log]);

  const stopImpersonation: AdminCtx["stopImpersonation"] = useCallback(() => {
    setImpersonatedId((prev) => {
      if (prev) {
        const target = members.find((m) => m.id === prev);
        log(`Stopped impersonating ${target?.name ?? prev}`, { id: prev, name: target?.name });
      }
      return null;
    });
  }, [members, log]);

  const impersonatedMember = useMemo(
    () => (impersonatedId ? members.find((m) => m.id === impersonatedId) ?? null : null),
    [impersonatedId, members]
  );

  return (
    <Ctx.Provider
      value={{
        members,
        addMember,
        setMemberRole,
        removeMember,
        impersonatedId,
        impersonatedMember,
        startImpersonation,
        stopImpersonation,
        auditLog,
        log,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};
