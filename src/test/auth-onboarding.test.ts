import { describe, expect, it } from "vitest";
import {
  getAuthCallbackError,
  getAuthCallbackUrl,
  getAuthFlowFromLocation,
  hasAuthCallbackCredential,
  validateDisplayName,
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

  it("requires a one-time credential before treating a URL as an auth callback", () => {
    expect(hasAuthCallbackCredential({ search: "?flow=invite&code=pkce-code", hash: "" })).toBe(true);
    expect(hasAuthCallbackCredential({ search: "?flow=invite", hash: "#access_token=access-token" })).toBe(true);
    expect(hasAuthCallbackCredential({ search: "?flow=invite", hash: "" })).toBe(false);
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

describe("employee profile name validation", () => {
  it("rejects an empty display name", () => {
    expect(validateDisplayName("   ")).toContain("Enter the name");
  });

  it("rejects a one-character display name", () => {
    expect(validateDisplayName("A")).toContain("at least 2 characters");
  });

  it("accepts a trimmed employee display name", () => {
    expect(validateDisplayName("  Ananya Sen  ")).toBeNull();
  });

  it("rejects a display name longer than 120 characters", () => {
    expect(validateDisplayName("A".repeat(121))).toContain("too long");
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
