import { supabase } from "@/integrations/supabase/client";
import type { OrganizationRole } from "@/context/AuthContext";

export interface InviteMemberInput {
  organizationId: string;
  email: string;
  role: Exclude<OrganizationRole, "org_admin">;
  displayName?: string;
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
