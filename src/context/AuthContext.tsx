import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type OrganizationRole = "org_admin" | "hr_admin" | "manager" | "supervisor" | "field_employee";

export interface OrganizationMembership {
  membership_id: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  member_role: OrganizationRole;
  member_status: "active";
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  membershipsLoading: boolean;
  memberships: OrganizationMembership[];
  activeMembership: OrganizationMembership | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
  setActiveOrganization: (organizationId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const ACTIVE_ORG_KEY = "fieldbuddy:active-organization";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(ACTIVE_ORG_KEY);
    } catch {
      return null;
    }
  });

  const refreshMemberships = useCallback(async () => {
    setMembershipsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setMemberships([]);
        return;
      }

      const { data, error } = (await supabase.rpc(
        "get_my_organization_memberships" as never,
      )) as unknown as {
        data: OrganizationMembership[] | null;
        error: { message: string } | null;
      };

      if (error) throw new Error(error.message);
      const rows = data ?? [];
      setMemberships(rows);
      if (!rows.some((item) => item.organization_id === activeOrganizationId)) {
        setActiveOrganizationId(rows[0]?.organization_id ?? null);
      }
    } finally {
      setMembershipsLoading(false);
    }
  }, [activeOrganizationId]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error("Unable to restore authentication session", error);
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setMemberships([]);
      setMembershipsLoading(false);
      return;
    }
    void refreshMemberships().catch((error: unknown) => {
      console.error("Unable to load organization memberships", error);
    });
  }, [session?.user.id, refreshMemberships]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setMemberships([]);
    setActiveOrganizationId(null);
    try {
      window.localStorage.removeItem(ACTIVE_ORG_KEY);
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, []);

  const setActiveOrganization = useCallback((organizationId: string) => {
    if (!memberships.some((item) => item.organization_id === organizationId)) return;
    setActiveOrganizationId(organizationId);
    try {
      window.localStorage.setItem(ACTIVE_ORG_KEY, organizationId);
    } catch {
      // The selected organization remains active for this session.
    }
  }, [memberships]);

  const activeMembership = useMemo(
    () => memberships.find((item) => item.organization_id === activeOrganizationId) ?? memberships[0] ?? null,
    [memberships, activeOrganizationId],
  );

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    membershipsLoading,
    memberships,
    activeMembership,
    signIn,
    signUp,
    signOut,
    refreshMemberships,
    setActiveOrganization,
  }), [
    session, loading, membershipsLoading, memberships, activeMembership,
    signIn, signUp, signOut, refreshMemberships, setActiveOrganization,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
