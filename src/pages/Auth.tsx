import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const Auth = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate("/app", { replace: true });
  }, [session, loading, navigate]);

  const sendLink = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid email", description: "Enter a valid email address", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not send link", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
    toast({ title: "Check your inbox", description: `We emailed a sign-in link to ${email}` });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-card p-6 lg:p-8"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-semibold leading-tight">Sign in</h1>
            <p className="text-xs text-muted-foreground">Field operations console</p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4 text-center py-2">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Link sent</p>
              <p className="text-xs text-muted-foreground mt-1">
                We emailed a sign-in link to <span className="text-foreground">{email}</span>.
                Open it on this device to continue.
              </p>
            </div>
            <button
              onClick={() => { setSent(false); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              ← Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendLink()}
                  placeholder="you@company.com"
                  className="pl-9"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">We'll email you a one-tap sign-in link.</p>
            </div>
            <Button onClick={sendLink} disabled={busy} className="w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Send sign-in link"}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
