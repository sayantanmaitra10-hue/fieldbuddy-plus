import { FormEvent, useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth, type OrganizationRole } from "@/context/AuthContext";
import {
  getOrganizationDirectory,
  inviteOrganizationMember,
  type OrganizationDirectoryMember,
} from "@/lib/organization-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, MailPlus, RefreshCw, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type InviteRole = Exclude<OrganizationRole, "org_admin">;

const roleLabels: Record<InviteRole, string> = {
  hr_admin: "HR Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  field_employee: "Field Employee",
};

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

  const loadMembers = useCallback(async (quiet = false) => {
    if (!organizationId) {
      setMembers([]);
      setLoading(false);
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

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    setSending(true);
    try {
      await inviteOrganizationMember({
        organizationId,
        email,
        role,
        displayName,
      });
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${email.trim()}.`,
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
              <Input id="invite-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" />
            </div>
            <div className="grid gap-1.5">
              <Label>Organization role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as InviteRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border p-4 lg:p-5">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <div>
                <h2 className="font-display text-lg font-semibold">Team directory</h2>
                <p className="text-xs text-muted-foreground">{members.length} memberships</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => void loadMembers(true)} disabled={refreshing}>
              <RefreshCw className={`mr-2 size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
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
                ) : members.length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">No team members found for this organization.</td></tr>
                ) : members.map((member) => (
                  <tr key={member.user_id} className="hover:bg-muted/20">
                    <td className="px-5 py-3">
                      <div className="font-medium">{member.display_name}</div>
                      {member.employee_id && <div className="text-xs text-muted-foreground">ID: {member.employee_id}</div>}
                    </td>
                    <td className="px-5 py-3">{roleLabels[member.member_role as InviteRole] ?? "Organization Admin"}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="capitalize">{member.member_status.replace("_", " ")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
};

export default Admin;
