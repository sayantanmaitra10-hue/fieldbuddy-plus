import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  updatePassword: vi.fn(),
  refreshMemberships: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "employee@example.com" },
    loading: false,
    updatePassword: mocks.updatePassword,
    refreshMemberships: mocks.refreshMemberships,
  }),
}));

import SetPassword from "@/pages/SetPassword";

function renderSetPassword() {
  return render(
    <MemoryRouter initialEntries={["/set-password?flow=invite"]}>
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
  });

  it("rejects mismatched password confirmation", async () => {
    renderSetPassword();

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "fieldbuddy-2026" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Save password and continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The passwords do not match");
    expect(mocks.updatePassword).not.toHaveBeenCalled();
  });

  it("saves a valid password, refreshes membership, and opens the workspace", async () => {
    renderSetPassword();

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "fieldbuddy-2026" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "fieldbuddy-2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Save password and continue" }));

    await waitFor(() => {
      expect(mocks.updatePassword).toHaveBeenCalledWith("fieldbuddy-2026");
      expect(mocks.refreshMemberships).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("Employee workspace test route")).toBeInTheDocument();
  });

  it("sends the user to access pending if membership refresh fails after the password is saved", async () => {
    mocks.refreshMemberships.mockRejectedValueOnce(new Error("temporary membership error"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    renderSetPassword();

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "fieldbuddy-2026" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "fieldbuddy-2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Save password and continue" }));

    await waitFor(() => expect(mocks.updatePassword).toHaveBeenCalled());
    expect(await screen.findByText("Access pending test route")).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
