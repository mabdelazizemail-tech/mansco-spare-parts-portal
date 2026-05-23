"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (submitted) {
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
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="MANSCO"
                width={52}
                height={52}
                className="shrink-0 object-contain"
                priority
              />
              <div className="ms-3.5 flex flex-col leading-none">
                <span
                  className="text-[22px] font-bold text-white tracking-[0.04em]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  MANSCO
                </span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                  Spare Parts Portal
                </span>
              </div>
            </div>

            {/* Footer */}
            <p className="text-xs text-white/25">
              &copy; MANSCO Egypt &middot; Operated for Peugeot Egypt
            </p>
          </div>
        </div>

        {/* RIGHT: Reset Confirmation */}
        <div className="flex flex-col justify-center bg-[#0D0D0D] px-10 py-12">
          <div className="mx-auto w-full max-w-sm">
            {/* Mobile logo */}
            <div className="mb-10 flex items-center gap-2 lg:hidden">
              <div className="relative h-8 w-8 shrink-0 overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="MANSCO"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span className="text-sm font-bold text-white">MANSCO Portal</span>
            </div>

            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>

            <h2 className="mb-2 text-2xl font-bold text-white">Check your email</h2>
            <p className="mb-8 text-sm text-white/40">
              We've sent a password reset link to <span className="font-medium text-white">{email}</span>
            </p>

            <div className="space-y-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400 mb-8">
              <p>✓ Check your inbox and spam folder</p>
              <p>✓ The link will expire in 24 hours</p>
              <p>✓ Click the link to reset your password</p>
            </div>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="MANSCO"
              width={52}
              height={52}
              className="shrink-0 object-contain"
              priority
            />
            <div className="ms-3.5 flex flex-col leading-none">
              <span
                className="text-[22px] font-bold text-white tracking-[0.04em]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                MANSCO
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                Spare Parts Portal
              </span>
            </div>
          </div>

          {/* Main content */}
          <div className="max-w-xl space-y-8">
            <h1 className="text-[2.75rem] font-bold leading-[1.15] text-white">
              Reset your password
              <br />
              securely.
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-white/50">
              Enter your email address and we'll send you a link to reset your password.
              <br />
              The link will expire in 24 hours.
            </p>
          </div>

          {/* Footer */}
          <p className="text-xs text-white/25">
            &copy; MANSCO Egypt &middot; Operated for Peugeot Egypt
          </p>
        </div>
      </div>

      {/* RIGHT: Reset Form */}
      <div className="flex flex-col justify-center bg-[#0D0D0D] px-10 py-12">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-2 lg:hidden">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden">
              <Image
                src="/logo.png"
                alt="MANSCO"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span className="text-sm font-bold text-white">MANSCO Portal</span>
          </div>

          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
            Password reset
          </p>
          <h2 className="mb-2 text-2xl font-bold text-white">Forgot password?</h2>
          <p className="mb-8 text-sm text-white/40">
            Enter your email address and we'll send you a reset link.
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
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#00BFA6]/50 focus:ring-1 focus:ring-[#00BFA6]/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00BFA6] text-[11px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#00BFA6]/90 disabled:opacity-50"
            >
              {loading ? "Sending link..." : "Send Reset Link"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/40">
            Remember your password?{" "}
            <Link
              href="/"
              className="font-medium text-[#00BFA6] underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
