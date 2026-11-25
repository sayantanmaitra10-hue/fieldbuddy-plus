import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}));

import AuthCallback from "@/pages/AuthCallback";

function renderCallback(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/set-password" element={<p>Password setup destination</p>} />
        <Route path="/access-pending" element={<p>Access pending destination</p>} />
        <Route path="/app" element={<p>Workspace destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthCallback", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
  });

  it("routes a verified invitation session to first-time password setup", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token", user: { id: "user-1" } } },
      error: null,
    });

    renderCallback("/auth/callback?flow=invite");
    expect(await screen.findByText("Password setup destination")).toBeInTheDocument();
  });

  it("shows an expired-link error from the Supabase callback URL", async () => {
    renderCallback("/auth/callback?error=access_denied&error_description=Email+link+expired");
    expect(await screen.findByRole("alert")).toHaveTextContent("Email link expired");
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("does not send a user to password setup when a credential fails to establish a session", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    renderCallback("/auth/callback?flow=recovery#access_token=expired-token");
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be verified");
  });

  it("does not reuse an existing signed-in session for a callback with no one-time credential", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "manager-token", user: { id: "manager-1" } } },
      error: null,
    });

    renderCallback("/auth/callback?flow=invite");
    expect(await screen.findByRole("alert")).toHaveTextContent("missing its secure sign-in credential");
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
});
