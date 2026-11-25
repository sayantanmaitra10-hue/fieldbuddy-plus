import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: mocks.signIn,
    signUp: mocks.signUp,
    requestPasswordReset: mocks.requestPasswordReset,
  }),
}));

import Login from "@/pages/Login";

describe("Login onboarding", () => {
  beforeEach(() => {
    mocks.signIn.mockReset().mockResolvedValue(undefined);
    mocks.signUp.mockReset().mockResolvedValue(undefined);
    mocks.requestPasswordReset.mockReset().mockResolvedValue(undefined);
  });

  it("lets a user request a password reset from the sign-in screen", async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "employee@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(mocks.requestPasswordReset).toHaveBeenCalledWith("employee@example.com");
    });
    expect(await screen.findByRole("status")).toHaveTextContent("If an account exists for that email");
  });

  it("explains that invited employees should use their invitation email for first-time setup", () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByText(/open their invitation email to set up their first password/i)).toBeInTheDocument();
  });
});
