import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { SyncBanner } from "@/components/SyncBanner";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";

export const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen flex bg-background">
    <Sidebar />
    <main className="flex-1 min-w-0 pb-20 lg:pb-0">
      <ImpersonationBanner />
      <SyncBanner />
      {children}
    </main>
    <MobileNav />
  </div>
);
