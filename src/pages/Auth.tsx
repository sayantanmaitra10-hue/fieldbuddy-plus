import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const Auth = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate("/app", { replace: true });
  }, [session, loading, navigate]);

  const sendOtp = async () => {
    if (!/^\+\d{10,15}$/.test(phone)) {
      toast({ title: "Invalid phone", description: "Use international format, e.g. +919876543210", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) {
      toast({ title: "Could not send code", description: error.message, variant: "destructive" });
      return;
    }
    setStep("otp");
    toast({ title: "Code sent", description: `We texted a 6-digit code to ${phone}` });
  };

  const verifyOtp = async () => {
    if (otp.length < 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setBusy(false);
    if (error) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Welcome", description: "You're signed in." });
    navigate("/app", { replace: true });
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

        {step === "phone" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="pl-9"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Include country code. We'll text a 6-digit code.</p>
            </div>
            <Button onClick={sendOtp} disabled={busy} className="w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Send code"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">Sent to {phone}</p>
            </div>
            <Button onClick={verifyOtp} disabled={busy} className="w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Verify & sign in"}
            </Button>
            <button
              onClick={() => { setStep("phone"); setOtp(""); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              ← Use a different number
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
