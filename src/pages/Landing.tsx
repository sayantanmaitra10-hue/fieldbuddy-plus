import { Link } from "react-router-dom";
import { ArrowRight, MapPin, ListChecks, ShieldCheck, Camera, MessageSquare, BarChart3, Bell, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: MapPin, title: "Geo-verified punch-in", text: "Configurable GPS boundaries with server-side validation and exception review." },
  { icon: ListChecks, title: "Task execution flow", text: "Pending → In Progress → Completed. Clean status transitions with required proof." },
  { icon: Camera, title: "Proof of work", text: "Photo or video uploads, auto-tagged with timestamp and GPS coordinates." },
  { icon: MessageSquare, title: "Task-linked chat", text: "Conversations live inside the task. No more lost context across WhatsApp threads." },
  { icon: BarChart3, title: "Real-time dashboard", text: "Live check-in counts, task progress, and per-employee tracking for managers." },
  { icon: Bell, title: "Smart alerts", text: "No-check-in, task delay, inactivity, and out-of-zone exceptions surfaced instantly." },
  { icon: WifiOff, title: "Offline-first", text: "Capture work without internet. Offline capture and confirmed server sync are being implemented." },
  { icon: ShieldCheck, title: "Role-based access", text: "Organization membership and server-enforced role permissions separate employee, manager, and administrator access." },
];

const Landing = () => (
  <div className="min-h-screen bg-background">
    {/* Nav */}
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border/60">
      <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg gradient-primary grid place-items-center text-primary-foreground font-display font-bold">F</div>
          <span className="font-display font-semibold tracking-tight">FieldBuddy Plus</span>
        </div>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#roles" className="hover:text-foreground transition-colors">Roles</a>
        </nav>
        <Link to="/login">
          <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            Open app <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    </header>

    {/* Hero */}
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 grid-dots opacity-40" />
      <div className="relative max-w-6xl mx-auto px-5 pt-20 pb-28 lg:pt-32 lg:pb-40 text-primary-foreground">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-medium mb-6">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Built for distributed field teams
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-balance">
            Workforce execution,<br />
            <span className="bg-gradient-to-r from-accent via-accent to-primary-glow bg-clip-text text-transparent">verified at the source.</span>
          </h1>
          <p className="text-lg lg:text-xl text-primary-foreground/75 mt-6 max-w-2xl leading-relaxed">
            Geo-verified attendance, structured tasks, photo proof, and live dashboards — one platform from punch-in to sign-off.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/login">
              <Button size="lg" className="gradient-gold text-primary hover:opacity-95 shadow-gold gap-2 font-semibold">
                Try the demo <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                See manager view
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-14 max-w-xl">
            {[
              { v: "GPS", l: "Location-aware attendance" },
              { v: "Tasks", l: "Structured execution" },
              { v: "Audit", l: "Traceable work records" },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-display text-3xl lg:text-4xl font-bold text-accent">{s.v}</div>
                <div className="text-xs lg:text-sm text-primary-foreground/65 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Features */}
    <section id="features" className="max-w-6xl mx-auto px-5 py-20 lg:py-28">
      <div className="max-w-2xl mb-12">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">The platform</div>
        <h2 className="font-display text-3xl lg:text-5xl font-semibold tracking-tight text-balance">
          Every action accounted for. Every minute visible.
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition-all">
              <div className="size-10 rounded-lg gradient-primary text-primary-foreground grid place-items-center mb-4">
                <Icon className="size-5" />
              </div>
              <h3 className="font-display font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </div>
          );
        })}
      </div>
    </section>

    {/* How it works */}
    <section id="how" className="bg-muted/40 border-y border-border">
      <div className="max-w-6xl mx-auto px-5 py-20 lg:py-28">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">A day in the field</div>
        <h2 className="font-display text-3xl lg:text-5xl font-semibold tracking-tight mb-12 max-w-2xl">From clock-in to sign-off.</h2>
        <div className="grid lg:grid-cols-3 gap-5">
          {[
            { n: "01", t: "Punch in", d: "Field user taps Start Day. GPS captures location. Geo-fence validates the zone." },
            { n: "02", t: "Execute & prove", d: "Tasks flow Pending → In Progress → Completed. Photo proof required to close." },
            { n: "03", t: "Manager sees all", d: "Dashboard updates live. Alerts fire on no-shows, delays, or zone breaches." },
          ].map((s) => (
            <div key={s.n} className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <div className="font-display text-5xl font-bold text-accent/80 mb-3">{s.n}</div>
              <div className="font-display font-semibold text-lg mb-1.5">{s.t}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Roles */}
    <section id="roles" className="max-w-6xl mx-auto px-5 py-20 lg:py-28">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">Built for every role</div>
          <h2 className="font-display text-3xl lg:text-5xl font-semibold tracking-tight mb-5 text-balance">One platform. Three perspectives.</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Field users get a focused mobile flow. Managers get a real-time command center. Admins control the whole system.
          </p>
          <Link to="/login">
            <Button variant="outline" className="gap-1.5">View permission matrix <ArrowRight className="size-4" /></Button>
          </Link>
        </div>
        <div className="space-y-3">
          {[
            { r: "Field User", d: "Punch-in, daily tasks, proof upload, task chat", to: "/app" },
            { r: "Manager", d: "Dashboard, team tracking, task assignment, alerts", to: "/app/dashboard" },
            { r: "Admin", d: "Roles, geo-fences, user management, exports", to: "/app/access" },
          ].map((r) => (
            <Link key={r.r} to={r.to} className="flex items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-card hover:border-primary/40 hover:shadow-elegant transition-all group">
              <div>
                <div className="font-display font-semibold">{r.r}</div>
                <div className="text-sm text-muted-foreground">{r.d}</div>
              </div>
              <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="px-5 pb-20">
      <div className="max-w-6xl mx-auto rounded-3xl gradient-hero p-10 lg:p-16 text-center text-primary-foreground shadow-elegant relative overflow-hidden">
        <div className="absolute inset-0 grid-dots opacity-30" />
        <div className="relative">
          <h2 className="font-display text-3xl lg:text-5xl font-semibold tracking-tight mb-4 text-balance">Ready to see it in action?</h2>
          <p className="text-primary-foreground/75 max-w-xl mx-auto mb-7">Sign in with your organization account. Access is granted according to your organization membership and assigned role.</p>
          <Link to="/login">
            <Button size="lg" className="gradient-gold text-primary hover:opacity-95 shadow-gold gap-2 font-semibold">
              Open the app <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>

    <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
      © FieldBuddy Plus · Workforce execution platform
    </footer>
  </div>
);

export default Landing;
