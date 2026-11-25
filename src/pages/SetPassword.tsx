import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { validateDisplayName, validatePasswordPair } from "@/lib/auth-onboarding";

export default function SetPassword() {
  const { user, loading, updatePassword, refreshMemberships } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const flow = new URLSearchParams(location.search).get("flow") === "recovery" ? "recovery" : "invite";
  const suggestedName = typeof user?.user_metadata?.display_name === "string"
    ? user.user_metadata.display_name
    : "";
  const [displayName, setDisplayName] = useState(suggestedName);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const nameError = flow === "invite" ? validateDisplayName(displayName) : null;
    if (nameError) {
      setError(nameError);
      return;
    }

    const passwordError = validatePasswordPair(password, confirmation);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setBusy(true);
    try {
      await updatePassword(password, flow === "invite" ? displayName.trim() : undefined);
      let membershipRefreshFailed = false;
      try {
        await refreshMemberships();
      } catch (membershipError) {
        membershipRefreshFailed = true;
        console.error("Password updated, but organization access could not be refreshed", membershipError);
      }
      navigate(membershipRefreshFailed ? "/access-pending" : "/app", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your account details could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <p className="text-sm text-muted-foreground">Checking your secure session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
          <Link to="/" className="text-sm font-semibold text-primary">FieldBuddy Plus</Link>
          <h1 className="mt-6 text-xl font-semibold">No active setup session</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Open the latest invitation or password-reset email on this device and follow its link again. Links can expire or be used only once.
          </p>
          <Link to="/login" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Go to sign in</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
        <Link to="/" className="text-sm font-semibold text-primary">FieldBuddy Plus</Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {flow === "recovery" ? "Choose a new password" : "Complete your employee account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {flow === "recovery"
            ? "Choose a new password for your FieldBuddy account."
            : "Your email has been verified. Choose the name your team will see and create your own password."}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">Login email: {user.email}</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {flow === "invite" && (
            <label className="block space-y-1.5 text-sm font-medium">
              Username / display name
              <input
                required
                type="text"
                minLength={2}
                maxLength={120}
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Enter the name your team will see"
                className="w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="block text-xs font-normal text-muted-foreground">
                This is your name in FieldBuddy. You will sign in later using your email address and password.
              </span>
            </label>
          )}

          <label className="block space-y-1.5 text-sm font-medium">
            {flow === "recovery" ? "New password" : "Create password"}
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="block text-xs font-normal text-muted-foreground">Use at least 8 characters.</span>
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Confirm password
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Saving account details…"
              : flow === "recovery" ? "Save password and continue" : "Activate account"}
          </button>
        </form>
      </section>
    </main>
  );
}
