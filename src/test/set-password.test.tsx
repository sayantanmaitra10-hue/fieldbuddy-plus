import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  updatePassword: vi.fn(),
  refreshMemberships: vi.fn(),
  userMetadata: { display_name: "Name entered by admin" },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "employee@example.com", user_metadata: mocks.userMetadata },
    loading: false,
    updatePassword: mocks.updatePassword,
    refreshMemberships: mocks.refreshMemberships,
  }),
}));

import SetPassword from "@/pages/SetPassword";

function renderSetPassword(path = "/set-password?flow=invite") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/app" element={<p>Employee workspace test route</p>} />
        <Route path="/access-pending" element={<p>Access pending test route</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SetPassword onboarding", () => {
  beforeEach(() => {
    mocks.updatePassword.mockReset().mockResolvedValue(undefined);
    mocks.refreshMemberships.mockReset().mockResolvedValue(undefined);
    mocks.userMetadata.display_name = "Name entered by admin";
  });

  it("shows the verified email and pre-fills the suggested employee name", () => {
    renderSetPassword();

    expect(screen.getByText("Login email: employee@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Username \/ display name/)).toHaveValue("Name entered by admin");
    expect(screen.getByRole("button", { name: "Activate account" })).toBeInTheDocument();
  });

  it("rejects mismatched password confirmation", async () => {
    renderSetPassword();

    fireEvent.change(screen.getByLabelText(/^Username \/ display name/), { target: { value: "Employee Name" } });
    fireEvent.change(screen.getByLabelText(/^Create password/), { target: { value: "fieldbuddy-2026" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Activate account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The passwords do not match");
    expect(mocks.updatePassword).not.toHaveBeenCalled();
  });

  it("requires a name for an invited employee before saving account details", async () => {
    renderSetPassword();

    fireEvent.change(screen.getByLabelText(/^Username \/ display name/), { target: { value: " " } });
    fireEvent.change(screen.getByLabelText(/^Create password/), { target: { value: "fieldbuddy-2026" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "fieldbuddy-2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Activate account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter the name you want your team to see");
    expect(mocks.updatePassword).not.toHaveBeenCalled();
  });

  it("saves the employee-selected name and password, refreshes membership, and opens the workspace", async () => {
    renderSetPassword();

    fireEvent.change(screen.getByLabelText(/^Username \/ display name/), { target: { value: "Employee Chosen Name" } });
    fireEvent.change(screen.getByLabelText(/^Create password/), { target: { value: "fieldbuddy-2026" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "fieldbuddy-2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Activate account" }));

    await waitFor(() => {
      expect(mocks.updatePassword).toHaveBeenCalledWith("fieldbuddy-2026", "Employee Chosen Name");
      expect(mocks.refreshMemberships).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("Employee workspace test route")).toBeInTheDocument();
  });

  it("keeps password recovery separate and does not ask the user to change their name", async () => {
    renderSetPassword("/set-password?flow=recovery");

    expect(screen.queryByLabelText("Username / display name")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: "fieldbuddy-2027" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "fieldbuddy-2027" } });
    fireEvent.click(screen.getByRole("button", { name: "Save password and continue" }));

    await waitFor(() => {
      expect(mocks.updatePassword).toHaveBeenCalledWith("fieldbuddy-2027", undefined);
    });
  });

  it("sends the user to access pending if membership refresh fails after the password is saved", async () => {
    mocks.refreshMemberships.mockRejectedValueOnce(new Error("temporary membership error"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    renderSetPassword();

    fireEvent.change(screen.getByLabelText(/^Username \/ display name/), { target: { value: "Employee Name" } });
    fireEvent.change(screen.getByLabelText(/^Create password/), { target: { value: "fieldbuddy-2026" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "fieldbuddy-2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Activate account" }));

    await waitFor(() => expect(mocks.updatePassword).toHaveBeenCalled());
    expect(await screen.findByText("Access pending test route")).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
