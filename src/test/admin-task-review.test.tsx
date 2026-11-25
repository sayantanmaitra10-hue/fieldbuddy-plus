import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  getDetail: vi.fn(),
  transition: vi.fn(),
  toast: vi.fn(),
  role: "manager",
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    activeMembership: { organization_id: "org-1", organization_name: "Test Organization" },
    user: { id: "admin-1" },
  }),
}));
vi.mock("@/context/RoleContext", () => ({
  useRole: () => ({ role: mocks.role }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock("@/lib/task-service", () => ({
  getOrganizationTaskDetail: mocks.getDetail,
  transitionOrganizationTask: mocks.transition,
  addOrganizationTaskComment: vi.fn(),
  getTaskAttachmentSignedUrl: vi.fn(),
  uploadOrganizationTaskAttachment: vi.fn(),
}));
vi.mock("@/components/layout/Topbar", () => ({
  Topbar: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
import TaskDetail from "@/pages/TaskDetail";

const detail = {
  task: {
    id: "task-1",
    title: "Prepare site inspection report",
    description: "Submit the inspection report for review.",
    assigned_to: "employee-1",
    created_by: "admin-1",
    due_at: "2026-11-30T12:00:00Z",
    priority: "high",
    status: "submitted",
    submitted_at: "2026-11-25T10:00:00Z",
    reviewed_by: null,
    reviewed_at: null,
    created_at: "2026-11-24T10:00:00Z",
    updated_at: "2026-11-25T10:00:00Z",
    assignee_name: "Test Employee",
    created_by_name: "Organization Admin",
  },
  comments: [],
  history: [],
  attachments: [],
};

function renderTaskDetail() {
  return render(
    <MemoryRouter initialEntries={["/app/tasks/task-1"]}>
      <Routes>
        <Route path="/app/tasks/:id" element={<TaskDetail />} />
        <Route path="/app/tasks" element={<p>Task board destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Admin task review", () => {
  beforeEach(() => {
    mocks.role = "manager";
    mocks.getDetail.mockReset().mockResolvedValue(detail);
    mocks.transition.mockReset().mockResolvedValue({ ...detail.task, status: "approved" });
    mocks.toast.mockReset();
  });

  it("allows a manager to approve a submitted task", async () => {
    renderTaskDetail();
    expect(await screen.findByText("Prepare site inspection report")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve task" }));

    await waitFor(() => expect(mocks.transition).toHaveBeenCalledWith({
      organizationId: "org-1",
      taskId: "task-1",
      nextStatus: "approved",
    }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Task updated" }));
  });

  it("allows a manager to request changes for a submitted task", async () => {
    renderTaskDetail();
    expect(await screen.findByText("Prepare site inspection report")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request changes" }));

    await waitFor(() => expect(mocks.transition).toHaveBeenCalledWith({
      organizationId: "org-1",
      taskId: "task-1",
      nextStatus: "rejected",
    }));
  });

  it("does not expose manager review actions to a field employee", async () => {
    mocks.role = "field";
    renderTaskDetail();
    expect(await screen.findByText("Prepare site inspection report")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve task" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request changes" })).not.toBeInTheDocument();
  });
});
