import type { OrganizationDirectoryMember } from "@/lib/organization-service";

export type DirectoryStatusFilter = "all" | OrganizationDirectoryMember["member_status"];

export interface DirectoryStatusCounts {
  total: number;
  active: number;
  invited: number;
  suspended: number;
  removed: number;
}

export function getDirectoryStatusCounts(members: OrganizationDirectoryMember[]): DirectoryStatusCounts {
  return members.reduce<DirectoryStatusCounts>((counts, member) => {
    counts.total += 1;
    counts[member.member_status] += 1;
    return counts;
  }, { total: 0, active: 0, invited: 0, suspended: 0, removed: 0 });
}

export function filterDirectoryMembers(members: OrganizationDirectoryMember[], query: string, status: DirectoryStatusFilter = "all"): OrganizationDirectoryMember[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return members.filter((member) => {
    if (status !== "all" && member.member_status !== status) return false;
    if (!normalizedQuery) return true;
    const searchable = [
      member.display_name,
      member.employee_id ?? "",
      member.member_role.replace(/_/g, " "),
      member.member_status.replace(/_/g, " "),
    ].join(" ").toLocaleLowerCase();
    return searchable.includes(normalizedQuery);
  });
}
