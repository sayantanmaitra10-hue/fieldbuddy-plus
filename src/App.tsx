import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { SyncProvider } from "@/context/SyncContext";
import { TasksProvider } from "@/context/TasksContext";
import { AdminProvider } from "@/context/AdminContext";
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
import Admin from "./pages/Admin";
import RemindersAudit from "./pages/RemindersAudit";
import Login from "./pages/Login";
import AccessPending from "./pages/AccessPending";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RoleProvider>
          <SyncProvider>
            <TasksProvider>
              <AdminProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/access-pending" element={<AccessPending />} />
                  <Route element={<ProtectedRoute><AppShell><Outlet /></AppShell></ProtectedRoute>}>
                    <Route path="/app" element={<FieldToday />} />
                    <Route path="/app/tasks" element={<TasksPage />} />
                    <Route path="/app/tasks/:id" element={<TaskDetail />} />
                    <Route path="/app/chat" element={<ChatPage />} />
                    <Route path="/app/dashboard" element={<RoleGuard allowed={["manager", "admin"]}><Dashboard /></RoleGuard>} />
                    <Route path="/app/team" element={<RoleGuard allowed={["manager", "admin"]}><Team /></RoleGuard>} />
                    <Route path="/app/team/:id" element={<RoleGuard allowed={["manager", "admin"]}><EmployeeDetail /></RoleGuard>} />
                    <Route path="/app/alerts" element={<RoleGuard allowed={["manager", "admin"]}><Alerts /></RoleGuard>} />
                    <Route path="/app/access" element={<RoleGuard allowed={["manager", "admin"]}><Access /></RoleGuard>} />
                    <Route path="/app/admin" element={<RoleGuard allowed={["admin"]}><Admin /></RoleGuard>} />
                    <Route path="/app/reminders" element={<RoleGuard allowed={["manager", "admin"]}><RemindersAudit /></RoleGuard>} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AdminProvider>
            </TasksProvider>
          </SyncProvider>
        </RoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
