import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { RoleProvider } from "@/context/RoleContext";
import { SyncProvider } from "@/context/SyncContext";
import { TasksProvider } from "@/context/TasksContext";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth";
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
      <BrowserRouter>
        <AuthProvider>
          <RoleProvider>
            <SyncProvider>
              <TasksProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/app" element={<ProtectedRoute><AppShell><FieldToday /></AppShell></ProtectedRoute>} />
                  <Route path="/app/tasks" element={<ProtectedRoute><AppShell><TasksPage /></AppShell></ProtectedRoute>} />
                  <Route path="/app/tasks/:id" element={<ProtectedRoute><AppShell><TaskDetail /></AppShell></ProtectedRoute>} />
                  <Route path="/app/chat" element={<ProtectedRoute><AppShell><ChatPage /></AppShell></ProtectedRoute>} />
                  <Route path="/app/dashboard" element={<ProtectedRoute requireRole="manager"><AppShell><Dashboard /></AppShell></ProtectedRoute>} />
                  <Route path="/app/team" element={<ProtectedRoute requireRole="manager"><AppShell><Team /></AppShell></ProtectedRoute>} />
                  <Route path="/app/team/:id" element={<ProtectedRoute requireRole="manager"><AppShell><EmployeeDetail /></AppShell></ProtectedRoute>} />
                  <Route path="/app/alerts" element={<ProtectedRoute><AppShell><Alerts /></AppShell></ProtectedRoute>} />
                  <Route path="/app/access" element={<ProtectedRoute requireRole="admin"><AppShell><Access /></AppShell></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TasksProvider>
            </SyncProvider>
          </RoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
