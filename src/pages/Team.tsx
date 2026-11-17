import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/context/AuthContext";
import { getOrganizationAssignees, type TaskAssignee } from "@/lib/task-service";
import { Users, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const roleLabel = (role: string) => ({
  org_admin: "Organization Admin",
  hr_admin: "HR Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  field_employee: "Field Employee",
}[role] ?? role);

const Team = () => {
  const { activeMembership } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TaskAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!activeMembership?.organization_id) {
      setMembers([]);
      setLoading(false);
      return;
    }
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      setMembers(await getOrganizationAssignees(activeMembership.organization_id));
    } catch (error) {
      toast({
        title: "Unable to load team",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeMembership?.organization_id, toast]);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <Topbar title="Team" subtitle={activeMembership?.organization_name ?? "Organization directory"} />
      <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="size-4" /> {members.length} active members</div>
          <Button size="sm" variant="outline" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" /> Loading directory…</div>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <Users className="mx-auto mb-3 size-7 text-muted-foreground" />
            <p className="font-medium">No active team members found</p>
            <p className="mt-1 text-xs text-muted-foreground">Invite employees from Organization Admin to populate this directory.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <article key={member.user_id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                    {member.display_name.split(" ").slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{member.display_name}</h3>
                    {member.employee_id && <p className="text-xs text-muted-foreground">Employee ID: {member.employee_id}</p>}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">{roleLabel(member.member_role)}</Badge>
                  <Badge variant="outline">Active</Badge>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Team;
