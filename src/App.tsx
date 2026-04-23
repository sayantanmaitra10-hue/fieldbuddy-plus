import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/context/RoleContext";
import { SyncProvider } from "@/context/SyncContext";
import { AppShell } from "@/components/layout/AppShell";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import FieldToday from "./pages/FieldToday";
import TasksPage from "./pages/TasksPage";
import TaskDetail from "./pages/TaskDetail";
import ChatPage from "./pages/ChatPage";
import Dashboard from "./pages/Dashboard";
import Team from "./pages/Team";
import EmployeeDetail from "./pages/EmployeeDetail";
import Alerts from "./pages/Alerts";
import Access from "./pages/Access";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <SyncProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/app" element={<AppShell><FieldToday /></AppShell>} />
            <Route path="/app/tasks" element={<AppShell><TasksPage /></AppShell>} />
            <Route path="/app/tasks/:id" element={<AppShell><TaskDetail /></AppShell>} />
            <Route path="/app/chat" element={<AppShell><ChatPage /></AppShell>} />
            <Route path="/app/dashboard" element={<AppShell><Dashboard /></AppShell>} />
            <Route path="/app/team" element={<AppShell><Team /></AppShell>} />
            <Route path="/app/team/:id" element={<AppShell><EmployeeDetail /></AppShell>} />
            <Route path="/app/alerts" element={<AppShell><Alerts /></AppShell>} />
            <Route path="/app/access" element={<AppShell><Access /></AppShell>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </SyncProvider>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
