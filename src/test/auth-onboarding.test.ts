import { describe, expect, it } from "vitest";
import {
  getAuthCallbackError,
  getAuthCallbackUrl,
  getAuthFlowFromLocation,
  validatePasswordPair,
} from "@/lib/auth-onboarding";

describe("authentication callback routing", () => {
  it("routes an invitation callback to first-time password setup", () => {
    expect(getAuthFlowFromLocation({ search: "?flow=invite&code=abc", hash: "" })).toBe("invite");
  });

  it("recognizes Supabase invite type in an implicit-flow fragment", () => {
    expect(getAuthFlowFromLocation({ search: "", hash: "#access_token=token&type=invite" })).toBe("invite");
  });

  it("recognizes a password recovery callback", () => {
    expect(getAuthFlowFromLocation({ search: "", hash: "#access_token=token&type=recovery" })).toBe("recovery");
  });

  it("recognizes a signup callback", () => {
    expect(getAuthFlowFromLocation({ search: "?type=signup", hash: "" })).toBe("signup");
  });

  it("defaults to the normal app route for an untyped callback", () => {
    expect(getAuthFlowFromLocation({ search: "", hash: "#access_token=token" })).toBe("app");
  });

  it("builds absolute callback URLs for the requested auth flow", () => {
    expect(getAuthCallbackUrl("https://fieldbuddy.example", "recovery"))
      .toBe("https://fieldbuddy.example/auth/callback?flow=recovery");
  });

  it("surfaces expired or denied callback details", () => {
    expect(getAuthCallbackError("?error=access_denied&error_description=Email+link+expired", ""))
      .toContain("Email link expired");
  });

  it("surfaces an error code even when the provider omits a description", () => {
    expect(getAuthCallbackError("?error_code=otp_expired", "")).toContain("otp_expired");
  });
});

describe("new password validation", () => {
  it("rejects passwords shorter than eight characters", () => {
    expect(validatePasswordPair("short7", "short7")).toContain("8 characters");
  });

  it("rejects mismatched confirmation values", () => {
    expect(validatePasswordPair("long-password", "different-password")).toContain("do not match");
  });

  it("accepts a matching password of at least eight characters", () => {
    expect(validatePasswordPair("fieldbuddy-2026", "fieldbuddy-2026")).toBeNull();
  });
});
