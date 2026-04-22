import { NavLink } from "react-router-dom";
import { useRole } from "@/context/RoleContext";
import { MapPin, ListChecks, MessageSquare, LayoutDashboard, Users, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof MapPin; end?: boolean };
const fieldNav: NavItem[] = [
  { to: "/app", label: "Today", icon: MapPin, end: true },
  { to: "/app/tasks", label: "Tasks", icon: ListChecks },
  { to: "/app/chat", label: "Chat", icon: MessageSquare },
];
const managerNav: NavItem[] = [
  { to: "/app/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/app/team", label: "Team", icon: Users },
  { to: "/app/tasks", label: "Tasks", icon: ListChecks },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
];

export const MobileNav = () => {
  const { role } = useRole();
  const items = role === "field" ? fieldNav : managerNav;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border">
      <div className="grid grid-cols-4 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <Icon className="size-5" />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
