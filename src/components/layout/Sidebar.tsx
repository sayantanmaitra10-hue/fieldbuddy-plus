import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, MapPin, ListChecks, Users, Bell, MessageSquare, Settings, Shield, UserCog, History, LogOut } from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof MapPin; end?: boolean };
const fieldNav: NavItem[] = [
  { to: "/app", label: "Today", icon: MapPin, end: true },
  { to: "/app/tasks", label: "Tasks", icon: ListChecks },
  { to: "/app/chat", label: "Messages", icon: MessageSquare },
];
const managerNav: NavItem[] = [
  // Managers and admins can also record their own attendance.
  { to: "/app", label: "Today", icon: MapPin, end: true },
  { to: "/app/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/app/team", label: "Team", icon: Users },
  { to: "/app/tasks", label: "Tasks", icon: ListChecks },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
  { to: "/app/reminders", label: "Reminders", icon: History },
  { to: "/app/access", label: "Access", icon: Shield },
];
const adminNav: NavItem[] = [
  ...managerNav,
  { to: "/app/admin", label: "Admin", icon: UserCog },
];

export const Sidebar = () => {
  const { role, setRole, availableRoles, canSwitch } = useRole();
  const items = role === "field" ? fieldNav : role === "admin" ? adminNav : managerNav;
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeMembership, signOut } = useAuth();
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? "Workspace user";
  const displayAvatar = String(displayName).split(" ").slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg gradient-gold grid place-items-center text-primary font-display font-bold">F</div>
          <div>
            <div className="font-display font-bold tracking-tight text-sidebar-foreground">FieldBuddy Plus</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/60">{activeMembership?.organization_name ?? "Workspace"}</div>
          </div>
        </div>
      </div>

      <div className="px-3 py-4">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
          {role === "field" ? "Field User" : role === "admin" ? "Admin" : "Manager"}
        </div>
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )
                }
              >
                <Icon className="size-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-3 border-t border-sidebar-border space-y-2">
        {canSwitch && (
          <>
            <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">View as</div>
            <div
              className="grid gap-1 p-1 bg-sidebar-accent/40 rounded-lg"
              style={{ gridTemplateColumns: `repeat(${availableRoles.length}, minmax(0, 1fr))` }}
            >
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={cn(
                    "py-1.5 text-xs rounded-md font-medium capitalize transition-all",
                    role === r
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="size-9 rounded-full bg-accent text-accent-foreground grid place-items-center text-xs font-semibold">{displayAvatar}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate text-sidebar-foreground">{displayName}</div>
            <div className="text-[11px] text-sidebar-foreground/60 truncate">
              {location.pathname}
            </div>
          </div>
          <button type="button" aria-label="Sign out" title="Sign out" onClick={() => void signOut().then(() => navigate("/login"))} className="rounded-md p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"><LogOut className="size-4" /></button>
        </div>
      </div>
    </aside>
  );
};
