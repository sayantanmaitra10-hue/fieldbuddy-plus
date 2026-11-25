export type AuthFlow = "invite" | "recovery" | "signup" | "app";

export function getAuthFlowFromLocation(location: Pick<Location, "search" | "hash">): AuthFlow {
  const search = new URLSearchParams(location.search.startsWith("?") ? location.search.slice(1) : location.search);
  const fragment = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : location.hash);

  const explicitFlow = search.get("flow");
  if (explicitFlow === "invite" || explicitFlow === "recovery" || explicitFlow === "signup") {
    return explicitFlow;
  }

  const authType = search.get("type") ?? fragment.get("type");
  if (authType === "invite") return "invite";
  if (authType === "recovery") return "recovery";
  if (authType === "signup") return "signup";
  return "app";
}

export function getAuthCallbackError(search: string, hash: string): string | null {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const fragment = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const description = query.get("error_description") ?? fragment.get("error_description");
  const code = query.get("error_code") ?? fragment.get("error_code");
  const error = query.get("error") ?? fragment.get("error");

  if (!description && !error) return null;
  const details = [description, code ? "code: " + code : null, error ? "error: " + error : null].filter(Boolean);
  return details.join(" — ");
}

export function getAuthCallbackUrl(origin: string, flow: "invite" | "recovery" | "signup"): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("flow", flow);
  return url.toString();
}

export function validatePasswordPair(password: string, confirmation: string): string | null {
  if (password.length < 8) return "Your password must contain at least 8 characters.";
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}
