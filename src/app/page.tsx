"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    if (email === "admin" && password === "admin") {
      document.cookie = "demo-admin=true; path=/; max-age=86400; SameSite=Lax";
      window.location.href = "/dashboard/admin";
      return;
    }

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const role = data.user?.user_metadata?.role;
    const status = data.user?.user_metadata?.registration_status;

    if (role === "admin" || role === "super_admin") {
      router.push("/dashboard/admin");
    } else if (status === "suspended") {
      router.push("/suspended");
    } else if (status === "approved") {
      router.push("/dashboard");
    } else {
      router.push("/pending-approval");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* LEFT: Hero */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between"
        style={{
          background:
            "linear-gradient(135deg, #0D0D0D 0%, #1a1a2e 40%, #16213e 70%, #0D0D0D 100%)",
        }}
      >
        {/* Warm gradient glow */}
        <div className="pointer-events-none absolute bottom-0 right-0 h-[60%] w-[60%] bg-gradient-to-tl from-[#00BFA6]/20 via-[#00BFA6]/5 to-transparent" />
        <div className="pointer-events-none absolute top-0 left-0 h-[40%] w-[50%] bg-gradient-to-br from-[#00BFA6]/10 to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden">
              <Image
                src="/peugeot-logo.png"
                alt="Peugeot"
                width={40}
                height={40}
                className="invert object-contain"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-[0.1em] text-white">
                MANSCO
              </span>
              <span className="text-[10px] font-medium tracking-[0.15em] text-white/50">
                SPARE PARTS PORTAL
              </span>
            </div>
          </div>

          {/* Main content */}
          <div className="max-w-xl space-y-8">
            <h1 className="text-[2.75rem] font-bold leading-[1.15] text-white">
              Self-service ordering
              <br />
              for Peugeot Egypt&apos;s dealer network.
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-white/50">
              Inquiry, ordering, tracking, financial follow-up and reporting —
              <br />
              backed by SAP, governed by clear rules.
            </p>

            <div className="grid grid-cols-2 gap-x-10 gap-y-3 pt-2">
              {[
                "Daily / Air-DHL / Stock orders",
                "Real-time SAP availability",
                "Credit & target visibility",
                "Campaign & discount eligibility",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#00BFA6]/60" />
                  <span className="text-sm text-white/60">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-white/25">
            &copy; MANSCO Egypt &middot; Operated for Peugeot Egypt
          </p>
        </div>
      </div>

      {/* RIGHT: Login Form */}
      <div className="flex flex-col justify-center bg-[#0D0D0D] px-10 py-12">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-2 lg:hidden">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden">
              <Image
                src="/peugeot-logo.png"
                alt="Peugeot"
                width={32}
                height={32}
                className="invert object-contain"
              />
            </div>
            <span className="text-sm font-bold text-white">MANSCO Portal</span>
          </div>

          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
            Sign in
          </p>
          <h2 className="mb-2 text-2xl font-bold text-white">
            Dealer &amp; Admin Portal
          </h2>
          <p className="mb-8 text-sm text-white/40">
            Use your assigned dealer credentials. Demo mode pre-fills mock data.
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-white/70"
              >
                Email
              </label>
              <input
                id="email"
                type="text"
                required
                placeholder="dealer@example.com"
                className="h-12 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#00BFA6]/50 focus:ring-1 focus:ring-[#00BFA6]/50"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-white/70"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="Enter your password"
                className="h-12 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#00BFA6]/50 focus:ring-1 focus:ring-[#00BFA6]/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00BFA6] text-[11px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#00BFA6]/90 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in as Dealer"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-1 text-sm">
            <a
              href="/forgot-password"
              className="font-medium text-[#00BFA6] hover:underline underline-offset-2"
            >
              Forgot password?
            </a>
            <span className="text-white/40">·</span>
            <span className="text-white/40">New dealer?</span>
            <a
              href="/register"
              className="font-medium text-[#00BFA6] underline underline-offset-2"
            >
              Register your dealership
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
