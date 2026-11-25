import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  getTasks: vi.fn(),
  getAssignees: vi.fn(),
  createTask: vi.fn(),
  transitionTask: vi.fn(),
  toast: vi.fn(),
  role: "manager",
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    activeMembership: { organization_id: "org-1", organization_name: "Test Organization" },
    user: { id: "admin-1" },
  }),
}));
vi.mock("@/context/RoleContext", () => ({ useRole: () => ({ role: mocks.role }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/lib/task-service", () => ({
  getOrganizationTasks: mocks.getTasks,
  getOrganizationAssignees: mocks.getAssignees,
  createOrganizationTask: mocks.createTask,
  transitionOrganizationTask: mocks.transitionTask,
}));
vi.mock("@/components/layout/Topbar", () => ({
  Topbar: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
import TasksPage from "@/pages/TasksPage";

function renderTasks() {
  return render(<MemoryRouter><TasksPage /></MemoryRouter>);
}

describe("Admin task creation", () => {
  beforeEach(() => {
    mocks.role = "manager";
    mocks.getTasks.mockReset().mockResolvedValue([]);
    mocks.getAssignees.mockReset().mockResolvedValue([
      { user_id: "employee-1", display_name: "Ananya Sen", employee_id: "EMP-101", member_role: "field_employee" },
      { user_id: "employee-2", display_name: "Rahul Das", employee_id: "EMP-102", member_role: "field_employee" },
    ]);
    mocks.createTask.mockReset().mockResolvedValue({ id: "task-1" });
    mocks.transitionTask.mockReset();
    mocks.toast.mockReset();
  });

  it("loads the active employee list and lets a manager create an assigned task", async () => {
    renderTasks();
    fireEvent.click(await screen.findByRole("button", { name: "New task" }));

    fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Visit customer site" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Complete the site inspection." } });
    fireEvent.change(screen.getByLabelText("Assign to"), { target: { value: "employee-2" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "urgent" } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => expect(mocks.createTask).toHaveBeenCalledWith({
      organizationId: "org-1",
      title: "Visit customer site",
      description: "Complete the site inspection.",
      assignedTo: "employee-2",
      dueAt: null,
      priority: "urgent",
    }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Task created" }));
    await waitFor(() => expect(mocks.getTasks).toHaveBeenCalledTimes(2));
  });

  it("does not show task creation controls to a field employee", async () => {
    mocks.role = "field";
    renderTasks();
    await screen.findByText("No tasks in this view");
    expect(screen.queryByRole("button", { name: "New task" })).not.toBeInTheDocument();
  });

  it("shows a useful error when task creation is rejected", async () => {
    mocks.createTask.mockRejectedValueOnce(new Error("Assignee is not active in this organization"));
    renderTasks();
    fireEvent.click(await screen.findByRole("button", { name: "New task" }));
    fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Visit customer site" } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Task creation failed",
      description: "Assignee is not active in this organization",
      variant: "destructive",
    })));
  });
});
