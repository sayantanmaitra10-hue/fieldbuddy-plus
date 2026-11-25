import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAuthCallbackError, getAuthFlowFromLocation } from "@/lib/auth-onboarding";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const flow = getAuthFlowFromLocation(location);
    const callbackError = getAuthCallbackError(location.search, location.hash);

    if (callbackError) {
      setError(callbackError);
      return () => { active = false; };
    }

    async function completeAuthentication() {
      // Supabase JS processes the PKCE code or token fragment during client
      // initialization. getSession waits for that initialization to finish.
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session) {
        throw new Error("This invitation or password-reset link could not be verified. It may have expired or already been used. Ask your administrator for a fresh invitation, or request a new reset link.");
      }

      if (!active) return;
      if (flow === "invite" || flow === "recovery") {
        navigate("/set-password?flow=" + flow, { replace: true });
      } else if (flow === "signup") {
        navigate("/access-pending", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    }

    void completeAuthentication().catch((cause: unknown) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : "We could not complete authentication. Please request a fresh link.");
    });

    return () => { active = false; };
  }, [location, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-7 text-center shadow-sm">
        <Link to="/" className="text-sm font-semibold text-primary">FieldBuddy Plus</Link>
        {error ? (
          <>
            <h1 className="mt-6 text-xl font-semibold">This link could not be completed</h1>
            <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-left text-sm text-destructive">{error}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link to="/login" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Go to sign in</Link>
              <Link to="/" className="rounded-lg border px-4 py-2.5 text-sm font-medium">Return to home</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-semibold">Completing secure sign-in…</h1>
            <p className="mt-3 text-sm text-muted-foreground">We are verifying your invitation or account link. Please keep this page open.</p>
            <div className="mx-auto mt-6 size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </>
        )}
      </section>
    </main>
  );
}
