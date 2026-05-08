import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useAdmin, type MemberRole } from "@/context/AdminContext";
import { useRole } from "@/context/RoleContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, UserCog, UserPlus, Trash2, LogIn } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "field", label: "Field" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

const roleColor: Record<MemberRole, string> = {
  field: "bg-muted text-foreground",
  manager: "bg-primary/15 text-primary",
  admin: "bg-accent/20 text-accent-foreground border border-accent/40",
};

const Admin = () => {
  const { role } = useRole();
  const navigate = useNavigate();
  const {
    members, addMember, setMemberRole, removeMember,
    startImpersonation, auditLog,
  } = useAdmin();
  const { setRole } = useRole();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [jobRole, setJobRole] = useState("Field Executive");
  const [appRole, setAppRole] = useState<MemberRole>("field");
  const [location, setLocation] = useState("");

  const recentAudit = useMemo(() => [...auditLog].reverse().slice(0, 12), [auditLog]);

  if (role !== "admin") {
    return (
      <>
        <Topbar title="Admin" subtitle="Restricted area" />
        <div className="p-8 max-w-xl">
          <div className="bg-card border border-border rounded-xl p-8 text-center shadow-card">
            <ShieldAlert className="size-10 mx-auto mb-3 text-warning" />
            <h2 className="font-display text-lg font-semibold mb-1">Admin only</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Switch your role to <span className="font-semibold">Admin</span> to manage team members,
              assign roles and impersonate accounts.
            </p>
            <Button onClick={() => setRole("admin")}>Switch to Admin</Button>
          </div>
        </div>
      </>
    );
  }

  const handleAdd = () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter the member's name." });
      return;
    }
    const m = addMember({ name: name.trim(), role: jobRole, appRole, location: location.trim() });
    toast({ title: "Member added", description: `${m.name} added as ${m.appRole}.` });
    setName(""); setLocation(""); setAppRole("field"); setJobRole("Field Executive");
    setOpen(false);
  };

  const handleImpersonate = (id: string, memberName: string) => {
    startImpersonation(id);
    // Switch the active role to mirror the impersonated member's experience
    const target = members.find((m) => m.id === id);
    if (target) setRole(target.appRole === "admin" ? "manager" : target.appRole);
    toast({
      title: `Now viewing as ${memberName}`,
      description: "All actions will be recorded in the audit log.",
    });
    navigate("/app");
  };

  return (
    <>
      <Topbar title="Admin Console" subtitle="Manage team & impersonate accounts" />
      <div className="p-4 lg:p-8 max-w-6xl space-y-6">
        {/* Members */}
        <section className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-4 lg:p-5 border-b border-border">
            <div>
              <h2 className="font-display text-lg font-semibold">Team members</h2>
              <p className="text-xs text-muted-foreground">{members.length} total</p>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <UserPlus className="size-4" /> Add member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add team member</DialogTitle>
                  <DialogDescription>New members appear instantly across the app.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="m-name">Full name</Label>
                    <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Neha Kapoor" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="m-job">Job title</Label>
                    <Input id="m-job" value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="m-loc">Location</Label>
                    <Input id="m-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bandra W, Mumbai" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>App role</Label>
                    <Select value={appRole} onValueChange={(v) => setAppRole(v as MemberRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleAdd}>Add member</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Member</th>
                  <th className="text-left font-medium px-5 py-3">Role</th>
                  <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Location</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full gradient-primary text-primary-foreground grid place-items-center text-xs font-semibold">
                          {m.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{m.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`capitalize ${roleColor[m.appRole]}`}>{m.appRole}</Badge>
                        <Select value={m.appRole} onValueChange={(v) => setMemberRole(m.id, v as MemberRole)}>
                          <SelectTrigger className="h-7 w-[110px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{m.location}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          onClick={() => handleImpersonate(m.id, m.name)}
                        >
                          <LogIn className="size-3.5" />
                          Log in as
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMember(m.id)}
                          title="Remove"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Audit log */}
        <section className="bg-card border border-border rounded-xl shadow-card">
          <div className="p-4 lg:p-5 border-b border-border flex items-center gap-2">
            <UserCog className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Audit log</h2>
            <span className="text-xs text-muted-foreground ml-1">(latest {recentAudit.length})</span>
          </div>
          <ul className="divide-y divide-border">
            {recentAudit.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground text-center">No admin actions recorded yet.</li>
            )}
            {recentAudit.map((e) => (
              <li key={e.id} className="px-5 py-3 flex items-start gap-3 text-sm">
                <div className="size-7 rounded-full bg-muted grid place-items-center text-[10px] font-semibold shrink-0">
                  {e.actor.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate"><span className="font-medium">{e.actor}</span> · {e.action}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(e.time).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
};

export default Admin;
