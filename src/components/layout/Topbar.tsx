import { useRole } from "@/context/RoleContext";
import { Wifi, WifiOff, Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Topbar = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const { role, setRole } = useRole();
  const [online, setOnline] = useState(true);
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-8 py-3 lg:py-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl lg:text-2xl font-semibold tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs lg:text-sm text-muted-foreground truncate">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnline(!online)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle connection (demo)"
          >
            {online ? <Wifi className="size-3.5 text-success" /> : <WifiOff className="size-3.5 text-warning" />}
            {online ? "Online" : "Offline · 3 queued"}
          </button>

          <div className="lg:hidden flex items-center gap-1 p-0.5 bg-muted rounded-md text-xs">
            {(["field", "manager"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                  role === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />
          </Button>
        </div>
      </div>
    </header>
  );
};
