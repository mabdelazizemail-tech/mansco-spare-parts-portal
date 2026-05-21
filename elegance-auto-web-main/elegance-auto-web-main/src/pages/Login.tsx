import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortal } from "@/lib/portal-data";
import peugeotLogo from "@/assets/peugeot-logo.png";

const Login = () => {
  const { setRole } = usePortal();
  const nav = useNavigate();
  const [email, setEmail] = useState("karim@autoprime.eg");
  const [password, setPassword] = useState("••••••••");

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center gap-3 sm:gap-3.5 lg:gap-4 rtl:text-right">
          <div className="h-11 w-11 sm:h-12 sm:w-12 lg:h-14 lg:w-14 xl:h-16 xl:w-16 rounded-md bg-white/10 backdrop-blur grid place-items-center p-1.5 sm:p-2 shrink-0 border border-white/10">
            <img src={peugeotLogo} alt="Peugeot" className="h-full w-full object-contain invert" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-display font-bold text-base sm:text-lg lg:text-xl tracking-[0.08em]">MANSCO</p>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-white/70 mt-0.5">Spare Parts Portal</p>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="display-xl text-white text-balance">Self-service ordering<br/>for Peugeot Egypt's dealer network.</h1>
          <p className="text-white/80 max-w-md">Inquiry, ordering, tracking, financial follow-up and reporting — backed by SAP, governed by clear rules.</p>
          <ul className="grid grid-cols-2 gap-3 text-sm max-w-md">
            {["Daily / Air-DHL / Stock orders", "Real-time SAP availability", "Credit & target visibility", "Campaign & discount eligibility"].map((f) => (
              <li key={f} className="flex items-start gap-2 text-white/90"><ShieldCheck className="h-4 w-4 text-white/60 mt-0.5 shrink-0" />{f}</li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/50">© MANSCO Egypt · Operated for Peugeot Egypt</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-3 sm:gap-3.5 rtl:text-right">
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-md bg-white/5 backdrop-blur grid place-items-center p-1.5 shrink-0 border border-white/10">
              <img src={peugeotLogo} alt="Peugeot" className="h-full w-full object-contain invert" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="font-display font-bold text-base sm:text-lg tracking-[0.08em]">MANSCO</p>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5">Spare Parts Portal</p>
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2">Sign in</p>
            <h2 className="display-md">Dealer & Admin Portal</h2>
            <p className="text-sm text-muted-foreground mt-2">Use your assigned dealer credentials. Demo mode pre-fills mock data.</p>
          </div>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setRole("dealer"); nav("/portal"); }}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Sign in as dealer <ArrowRight className="h-4 w-4" /></Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[hsl(var(--hairline))]" /></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider"><span className="bg-background px-2 text-muted-foreground">Demo shortcuts</span></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => { setRole("dealer"); nav("/portal"); }}>
              <Building2 className="h-4 w-4" /> Dealer
            </Button>
            <Button variant="outline" onClick={() => { setRole("admin"); nav("/admin"); }}>
              <ShieldCheck className="h-4 w-4" /> Admin
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Need access? <Link to="/portal" className="text-primary hover:underline">Contact your account manager</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
