import { describe, expect, it } from "vitest";
import { filterDirectoryMembers, getDirectoryStatusCounts } from "@/lib/organization-directory";
import type { OrganizationDirectoryMember } from "@/lib/organization-service";

const members: OrganizationDirectoryMember[] = [
  { user_id: "a", display_name: "Ananya Sen", employee_id: "EMP-101", avatar_url: null, member_role: "field_employee", member_status: "active", joined_at: null },
  { user_id: "b", display_name: "Rahul Das", employee_id: "EMP-102", avatar_url: null, member_role: "manager", member_status: "invited", joined_at: null },
  { user_id: "c", display_name: "Mita Roy", employee_id: "EMP-103", avatar_url: null, member_role: "supervisor", member_status: "suspended", joined_at: null },
  { user_id: "d", display_name: "Arup Dey", employee_id: null, avatar_url: null, member_role: "hr_admin", member_status: "removed", joined_at: null },
];

describe("organization directory", () => {
  it("counts each membership status", () => {
    expect(getDirectoryStatusCounts(members)).toEqual({ total: 4, active: 1, invited: 1, suspended: 1, removed: 1 });
  });
  it("returns zero counts for an empty directory", () => {
    expect(getDirectoryStatusCounts([])).toEqual({ total: 0, active: 0, invited: 0, suspended: 0, removed: 0 });
  });
  it("filters membership status", () => {
    expect(filterDirectoryMembers(members, "", "invited").map((m) => m.user_id)).toEqual(["b"]);
  });
  it("searches names without case sensitivity", () => {
    expect(filterDirectoryMembers(members, "ANANYA").map((m) => m.user_id)).toEqual(["a"]);
  });
  it("searches employee IDs and readable role names", () => {
    expect(filterDirectoryMembers(members, "emp-103").map((m) => m.user_id)).toEqual(["c"]);
    expect(filterDirectoryMembers(members, "field employee").map((m) => m.user_id)).toEqual(["a"]);
  });
  it("combines the query and status filters", () => {
    expect(filterDirectoryMembers(members, "mita", "active")).toEqual([]);
    expect(filterDirectoryMembers(members, "mita", "suspended").map((m) => m.user_id)).toEqual(["c"]);
  });
  it("treats a blank query as unfiltered", () => {
    expect(filterDirectoryMembers(members, "   ")).toEqual(members);
  });
});
