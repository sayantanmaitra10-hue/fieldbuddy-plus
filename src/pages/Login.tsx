import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!loading && user) return <Navigate to="/app" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "signin") {
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
        <Link to="/" className="text-sm font-semibold text-primary">FieldBuddy Plus</Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in to your workspace" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Secure access for your field workforce.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <label className="block space-y-1.5 text-sm font-medium">
              Full name
              <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name" className="w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary" />
            </label>
          )}
          <label className="block space-y-1.5 text-sm font-medium">
            Work email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)}
              autoComplete="email" className="w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Password
            <input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary" />
            {mode === "signup" && <span className="block text-xs font-normal text-muted-foreground">Use at least 8 characters.</span>}
          </label>

          {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {notice && <p role="status" className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{notice}</p>}

          <button disabled={busy} type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to FieldBuddy? " : "Already have an account? "}
          <button type="button" className="font-medium text-primary hover:underline"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}
