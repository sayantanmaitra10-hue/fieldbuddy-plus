import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth, type OrganizationRole } from "@/context/AuthContext";
import {
  getOrganizationDirectory,
  inviteOrganizationMember,
  type OrganizationDirectoryMember,
} from "@/lib/organization-service";
import {
  filterDirectoryMembers,
  getDirectoryStatusCounts,
  type DirectoryStatusFilter,
} from "@/lib/organization-directory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, MailPlus, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type InviteRole = Exclude<OrganizationRole, "org_admin">;

const roleLabels: Record<InviteRole, string> = {
  hr_admin: "HR Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  field_employee: "Field Employee",
};

const statusLabels: Record<OrganizationDirectoryMember["member_status"], string> = {
  active: "Active",
  invited: "Invitation pending",
  suspended: "Suspended",
  removed: "Removed",
};

function statusVariant(status: OrganizationDirectoryMember["member_status"]) {
  if (status === "active") return "default" as const;
  if (status === "suspended") return "destructive" as const;
  if (status === "invited") return "secondary" as const;
  return "outline" as const;
}

const Admin = () => {
  const { activeMembership } = useAuth();
  const organizationId = activeMembership?.organization_id;
  const [members, setMembers] = useState<OrganizationDirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("field_employee");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DirectoryStatusFilter>("all");

  const loadMembers = useCallback(async (quiet = false) => {
    if (!organizationId) {
      setMembers([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      setMembers(await getOrganizationDirectory(organizationId));
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
  }, [organizationId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const counts = useMemo(() => getDirectoryStatusCounts(members), [members]);
  const visibleMembers = useMemo(
    () => filterDirectoryMembers(members, search, statusFilter),
    [members, search, statusFilter],
  );

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || sending) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = displayName.trim();
    if (!normalizedEmail) return;

    setSending(true);
    try {
      await inviteOrganizationMember({
        organizationId,
        email: normalizedEmail,
        role,
        displayName: normalizedName,
      });
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${normalizedEmail}.`,
      });
      setDisplayName("");
      setEmail("");
      setRole("field_employee");
      await loadMembers(true);
    } catch (error) {
      toast({
        title: "Invitation failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Topbar title="Organization Admin" subtitle={activeMembership?.organization_name ?? "Manage organization access"} />
      <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <MailPlus className="size-5 text-primary" />
            <div>
              <h2 className="font-display text-lg font-semibold">Invite a team member</h2>
              <p className="text-xs text-muted-foreground">They will receive an email invitation to join this organization.</p>
            </div>
          </div>
          <form onSubmit={handleInvite} className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="invite-name">Full name (optional)</Label>
              <Input id="invite-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Employee name" maxLength={120} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="invite-email">Work email</Label>
              <Input id="invite-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" autoComplete="email" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="invite-role">Organization role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as InviteRole)}>
                <SelectTrigger id="invite-role" aria-label="Organization role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={sending || !organizationId} className="w-full gap-2 md:w-auto">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <MailPlus className="size-4" />}
                {sending ? "Sending invitation…" : "Send invitation"}
              </Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Organization administrator privileges cannot be granted through this invitation form.
          </p>
        </section>

        <section aria-label="Team membership summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total memberships", value: counts.total },
            { label: "Active", value: counts.active },
            { label: "Invitations pending", value: counts.invited },
            { label: "Suspended", value: counts.suspended },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{item.value}</div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="flex flex-col gap-4 border-b border-border p-4 lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                <div>
                  <h2 className="font-display text-lg font-semibold">Team directory</h2>
                  <p className="text-xs text-muted-foreground">
                    Showing {visibleMembers.length} of {members.length} memberships
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => void loadMembers(true)} disabled={refreshing || loading}>
                <RefreshCw className={`mr-2 size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search team directory"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, employee ID or role"
                  className="pl-9"
                />
              </div>
              <select
                aria-label="Filter by access status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as DirectoryStatusFilter)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All access statuses</option>
                <option value="active">Active</option>
                <option value="invited">Invitation pending</option>
                <option value="suspended">Suspended</option>
                <option value="removed">Removed</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Organization role</th>
                  <th className="px-5 py-3 font-medium">Access status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">Loading team directory…</td></tr>
                ) : visibleMembers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                      {members.length === 0
                        ? "No team members found for this organization."
                        : "No members match your search and access-status filter."}
                    </td>
                  </tr>
                ) : visibleMembers.map((member) => (
                  <tr key={member.user_id} className="hover:bg-muted/20">
                    <td className="px-5 py-3">
                      <div className="font-medium">{member.display_name || "Unnamed member"}</div>
                      {member.employee_id && <div className="text-xs text-muted-foreground">ID: {member.employee_id}</div>}
                    </td>
                    <td className="px-5 py-3">{roleLabels[member.member_role as InviteRole] ?? "Organization Admin"}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusVariant(member.member_status)}>{statusLabels[member.member_status]}</Badge>
                    </td>
                  </tr>
                ))
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
};

export default Admin;
