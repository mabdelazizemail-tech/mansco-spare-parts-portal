"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Check if user has a valid password reset session
    const supabase = createClient();

    // First, check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        // If no session, wait for auth state change (recovery code processing)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (newSession) {
              setSessionReady(true);
            } else if (event === 'SIGNED_OUT') {
              setError("Invalid or expired reset link. Please try again.");
            }
          }
        );

        // Set error after 2 seconds if no session is established
        const timeout = setTimeout(() => {
          if (!sessionReady) {
            setError("Invalid or expired reset link. Please try again.");
          }
        }, 2000);

        return () => {
          subscription?.unsubscribe();
          clearTimeout(timeout);
        };
      }
    });
  }, [sessionReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
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

            {/* Footer */}
            <p className="text-xs text-white/25">
              &copy; MANSCO Egypt &middot; Operated for Peugeot Egypt
            </p>
          </div>
        </div>

        {/* RIGHT: Success */}
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

            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>

            <h2 className="mb-2 text-2xl font-bold text-white">Password reset!</h2>
            <p className="mb-8 text-sm text-white/40">
              Your password has been reset successfully. Redirecting to login...
            </p>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white"
            >
              Go to Login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
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

            {/* Footer */}
            <p className="text-xs text-white/25">
              &copy; MANSCO Egypt &middot; Operated for Peugeot Egypt
            </p>
          </div>
        </div>

        {/* RIGHT: Error */}
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

            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>

            <h2 className="mb-2 text-2xl font-bold text-white">Link expired</h2>
            <p className="mb-8 text-sm text-white/40">{error}</p>

            <Link
              href="/forgot-password"
              className="flex items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white"
            >
              Request new link
              <ArrowRight className="h-4 w-4" />
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
              Create a new password.
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-white/50">
              Enter your new password below. Make sure it's at least 8 characters long and includes uppercase, lowercase, and numbers for security.
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
            Create new password
          </p>
          <h2 className="mb-2 text-2xl font-bold text-white">Reset password</h2>
          <p className="mb-8 text-sm text-white/40">
            Enter your new password below.
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
                htmlFor="password"
                className="text-sm font-medium text-white/70"
              >
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#00BFA6]/50 focus:ring-1 focus:ring-[#00BFA6]/50"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-white/70"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#00BFA6]/50 focus:ring-1 focus:ring-[#00BFA6]/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00BFA6] text-[11px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#00BFA6]/90 disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
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
