import { supabase } from "@/integrations/supabase/client";

export interface DashboardTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  created_at: string;
  assignee_name: string;
}

export interface OrganizationDashboardSummary {
  active_members: number;
  checked_in_today: number;
  open_tasks: number;
  tasks_in_progress: number;
  awaiting_review: number;
  tasks_approved: number;
  recent_tasks: DashboardTask[];
  work_date: string;
}

export async function getOrganizationDashboard(organizationId: string) {
  const { data, error } = (await supabase.rpc(
    "get_organization_dashboard" as never,
    { p_organization_id: organizationId } as never,
  )) as unknown as {
    data: OrganizationDashboardSummary | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Dashboard summary is unavailable");
  return data;
}
