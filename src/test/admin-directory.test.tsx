import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ getDirectory: vi.fn(), invite: vi.fn(), toast: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ activeMembership: { organization_id: "org-1", organization_name: "Test Organization" } }),
}));
vi.mock("@/lib/organization-service", () => ({
  getOrganizationDirectory: mocks.getDirectory, inviteOrganizationMember: mocks.invite,
}));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/components/layout/Topbar", () => ({
  Topbar: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
import Admin from "@/pages/Admin";

const rows = [
  { user_id: "a", display_name: "Ananya Sen", employee_id: "EMP-101", avatar_url: null, member_role: "field_employee", member_status: "active", joined_at: null },
  { user_id: "b", display_name: "Rahul Das", employee_id: "EMP-102", avatar_url: null, member_role: "manager", member_status: "invited", joined_at: null },
];
const renderAdmin = () => render(<MemoryRouter><Admin /></MemoryRouter>);

describe("Organization Admin", () => {
  beforeEach(() => {
    mocks.getDirectory.mockReset().mockResolvedValue(rows);
    mocks.invite.mockReset().mockResolvedValue({});
    mocks.toast.mockReset();
  });

  it("shows the directory and membership status totals", async () => {
    renderAdmin();
    expect(await screen.findByText("Ananya Sen")).toBeInTheDocument();
    expect(screen.getByText("Invitation pending")).toBeInTheDocument();
    expect(screen.getByText("Total memberships").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Invitations pending").parentElement).toHaveTextContent("1");
  });

  it("searches by employee ID and applies a status filter", async () => {
    renderAdmin();
    await screen.findByText("Ananya Sen");
    fireEvent.change(screen.getByRole("textbox", { name: "Search team directory" }), { target: { value: "EMP-102" } });
    expect(screen.getByText("Rahul Das")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by access status" }), { target: { value: "active" } });
    expect(screen.queryByText("Rahul Das")).not.toBeInTheDocument();
    expect(screen.getByText("No members match your search and access-status filter.")).toBeInTheDocument();
  });

  it("normalizes the invitation email and refreshes the directory", async () => {
    renderAdmin();
    await screen.findByText("Ananya Sen");
    fireEvent.change(screen.getByLabelText("Full name (optional)"), { target: { value: " Test Employee " } });
    fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "TEST@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    await waitFor(() => expect(mocks.invite).toHaveBeenCalledWith({
      organizationId: "org-1", email: "test@example.com", role: "field_employee", displayName: "Test Employee",
    }));
    await waitFor(() => expect(mocks.getDirectory).toHaveBeenCalledTimes(2));
  });
});
