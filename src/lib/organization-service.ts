import { supabase } from "@/integrations/supabase/client";
import type { OrganizationRole } from "@/context/AuthContext";

export interface InviteMemberInput {
  organizationId: string;
  email: string;
  role: Exclude<OrganizationRole, "org_admin">;
  displayName?: string;
}

export interface OrganizationDirectoryMember {
  user_id: string;
  display_name: string;
  employee_id: string | null;
  avatar_url: string | null;
  member_role: OrganizationRole;
  member_status: "invited" | "active" | "suspended" | "removed";
  joined_at: string | null;
}

export async function inviteOrganizationMember(input: InviteMemberInput) {
  const { data, error } = await supabase.functions.invoke("invite-member", {
    body: {
      organizationId: input.organizationId,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      displayName: input.displayName?.trim() || undefined,
    },
  });

  if (error) {
    const message = data && typeof data === "object" && "error" in data
      ? String(data.error)
      : error.message;
    throw new Error(message || "Unable to invite this employee");
  }

  if (data?.error) throw new Error(String(data.error));
  return data;
}

export async function getOrganizationDirectory(organizationId: string) {
  const { data, error } = (await supabase.rpc(
    "get_organization_directory" as never,
    { p_organization_id: organizationId } as never,
  )) as unknown as {
    data: OrganizationDirectoryMember[] | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);
  return data ?? [];
}
