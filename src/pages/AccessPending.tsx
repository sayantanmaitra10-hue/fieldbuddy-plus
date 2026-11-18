import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AccessPending() {
  const {
    user,
    signOut,
    refreshMemberships,
    memberships,
    membershipsLoading,
  } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  // If the membership query succeeds (including the automatic refresh made
  // by AuthProvider), move the signed-in user into the protected workspace.
  useEffect(() => {
    if (memberships.length > 0) {
      navigate("/app", { replace: true });
    }
  }, [memberships.length, navigate]);

  async function handleCheckAccess() {
    setChecking(true);
    setMessage("");
    try {
      await refreshMemberships();
      // Membership state is updated by AuthContext. The effect above will
      // navigate to /app if an active membership is returned.
      setMessage(
        "No active organization membership was found for this account yet. If an administrator has just added you, wait a moment and check again."
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? `We couldn't check your organization access: ${cause.message}`
          : "We couldn't check your organization access. Please try again."
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? `Unable to sign out: ${cause.message}`
          : "Unable to sign out. Please try again."
      );
    }
  }

  const isBusy = checking || membershipsLoading;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <section className="w-full max-w-lg rounded-2xl border bg-card p-7 shadow-sm">
        <h1 className="text-xl font-semibold">Your organization access is pending</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your account ({user?.email}) is authenticated, but it is not yet linked to an active FieldBuddy organization.
          Ask your organization administrator to invite or activate your membership.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => void handleCheckAccess()}
            disabled={isBusy}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Checking access…" : "Check access again"}
          </button>
          <button
            onClick={() => void handleSignOut()}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Sign out
          </button>
          <Link to="/" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground">
            Back to home
          </Link>
        </div>
        {message && (
          <p role="status" className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
