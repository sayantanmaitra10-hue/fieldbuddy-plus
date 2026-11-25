import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type LoginMode = "signin" | "signup" | "forgot";

export default function Login() {
  const { user, loading, signIn, signUp, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<LoginMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!loading && user) return <Navigate to="/app" replace />;

  function changeMode(nextMode: LoginMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "forgot") {
        await requestPasswordReset(email);
        setNotice("If an account exists for that email, a password-reset link has been sent. Check your inbox and spam folder.");
      } else if (mode === "signin") {
        await signIn(email, password);
        navigate((location.state as { from?: string } | null)?.from ?? "/app", { replace: true });
      } else {
        await signUp(email, password, displayName);
        setNotice("Account created. If email confirmation is enabled, verify your email and then sign in. An organization administrator must add you to an organization before you can access the workspace.");
        setMode("signin");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signin"
    ? "Sign in to your workspace"
    : mode === "signup"
      ? "Create your account"
      : "Reset your password";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
        <Link to="/" className="text-sm font-semibold text-primary">FieldBuddy Plus</Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "forgot"
            ? "Enter your work email and we will send a secure password-reset link."
            : "Secure access for your field workforce."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <label className="block space-y-1.5 text-sm font-medium">
              Full name
              <input
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                className="w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          )}
          <label className="block space-y-1.5 text-sm font-medium">
            Work email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          {mode !== "forgot" && (
            <label className="block space-y-1.5 text-sm font-medium">
              Password
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
              />
              {mode === "signup" && (
                <span className="block text-xs font-normal text-muted-foreground">Use at least 8 characters.</span>
              )}
            </label>
          )}

          {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {notice && <p role="status" className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{notice}</p>}

          <button
            disabled={busy}
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          {mode === "signin" && (
            <>
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => changeMode("forgot")}>
                Forgot password?
              </button>
              <span>
                New to FieldBuddy?{" "}
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => changeMode("signup")}>
                  Create an account
                </button>
              </span>
              <p className="max-w-sm text-xs leading-5">
                Employees who have been invited by an organization should open their invitation email to set up their first password.
              </p>
            </>
          )}
          {mode === "signup" && (
            <span>
              Already have an account?{" "}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => changeMode("signin")}>
                Sign in
              </button>
            </span>
          )}
          {mode === "forgot" && (
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => changeMode("signin")}>
              Back to sign in
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
