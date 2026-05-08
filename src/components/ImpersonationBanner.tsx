import { useAdmin } from "@/context/AdminContext";
import { useRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/button";
import { UserCog, X } from "lucide-react";

export const ImpersonationBanner = () => {
  const { impersonatedMember, stopImpersonation } = useAdmin();
  const { setRole } = useRole();

  if (!impersonatedMember) return null;

  const handleExit = () => {
    stopImpersonation();
    setRole("admin");
  };

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-accent/95 to-accent text-accent-foreground shadow-elegant">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-8 py-2 text-xs lg:text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <UserCog className="size-4 shrink-0" />
          <span className="font-medium truncate">
            Viewing as <span className="font-display font-semibold">{impersonatedMember.name}</span>
            <span className="opacity-75 ml-1.5 hidden sm:inline">· actions are recorded in the audit log</span>
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleExit}
          className="h-7 px-2.5 gap-1.5 shrink-0"
        >
          <X className="size-3.5" />
          Exit
        </Button>
      </div>
    </div>
  );
};
