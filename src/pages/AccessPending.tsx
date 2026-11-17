import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AccessPending() {
  const { user, signOut, refreshMemberships } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <section className="w-full max-w-lg rounded-2xl border bg-card p-7 shadow-sm">
        <h1 className="text-xl font-semibold">Your organization access is pending</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your account ({user?.email}) is authenticated, but it is not yet linked to an active FieldBuddy organization.
          Ask your organization administrator to invite or activate your membership.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => void refreshMemberships()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Check access again
          </button>
          <button onClick={() => void signOut()} className="rounded-lg border px-4 py-2 text-sm font-medium">
            Sign out
          </button>
          <Link to="/" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
