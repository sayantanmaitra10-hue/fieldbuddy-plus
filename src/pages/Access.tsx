import { Topbar } from "@/components/layout/Topbar";
import { Shield, Check, X } from "lucide-react";

const matrix = [
  { perm: "View assigned tasks", field: true, manager: true, admin: true },
  { perm: "Update task status", field: true, manager: true, admin: true },
  { perm: "Upload proof of work", field: true, manager: true, admin: true },
  { perm: "Punch in / check out", field: true, manager: true, admin: true },
  { perm: "Create & assign tasks", field: false, manager: true, admin: true },
  { perm: "Access manager dashboard", field: false, manager: true, admin: true },
  { perm: "View team activity", field: false, manager: true, admin: true },
  { perm: "Resolve alerts", field: false, manager: true, admin: true },
  { perm: "Configure geo-fences", field: false, manager: false, admin: true },
  { perm: "Manage users & roles", field: false, manager: false, admin: true },
  { perm: "Export reports", field: false, manager: true, admin: true },
];

const Cell = ({ on }: { on: boolean }) =>
  on ? <Check className="size-4 text-success mx-auto" /> : <X className="size-4 text-muted-foreground/50 mx-auto" />;

const Access = () => (
  <>
    <Topbar title="Role-Based Access" subtitle="Permissions across roles" />
    <div className="p-4 lg:p-8 max-w-4xl">
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[
          { name: "Field User", desc: "Execute tasks on the ground", count: 24 },
          { name: "Manager", desc: "Assign work, monitor teams", count: 4 },
          { name: "Admin", desc: "Configure & control all", count: 2 },
        ].map((r) => (
          <div key={r.name} className="bg-card border border-border rounded-xl p-4 shadow-card">
            <Shield className="size-4 text-primary mb-2" />
            <div className="font-display font-semibold">{r.name}</div>
            <div className="text-xs text-muted-foreground mb-2">{r.desc}</div>
            <div className="text-2xl font-display font-bold">{r.count}<span className="text-xs text-muted-foreground font-normal ml-1">users</span></div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="text-left font-medium px-5 py-3">Permission</th>
              <th className="font-medium px-5 py-3 w-24">Field</th>
              <th className="font-medium px-5 py-3 w-24">Manager</th>
              <th className="font-medium px-5 py-3 w-24">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matrix.map((m) => (
              <tr key={m.perm}>
                <td className="px-5 py-3">{m.perm}</td>
                <td className="px-5 py-3"><Cell on={m.field} /></td>
                <td className="px-5 py-3"><Cell on={m.manager} /></td>
                <td className="px-5 py-3"><Cell on={m.admin} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>
);

export default Access;
