"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, ArrowLeft, XCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PageStatus = "loading" | "pending" | "rejected" | "approved";

export default function PendingApprovalPage() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    // FIX (G3): Dynamically fetch the user's actual registration status so
    // rejected dealers see their rejection reason instead of "Under Review".
    async function fetchStatus() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("pending");
        return;
      }

      const regStatus = user.user_metadata?.registration_status as string | undefined;
      const reason = user.user_metadata?.rejection_reason as string | undefined;
      const name = user.user_metadata?.company_name as string | undefined;

      setCompanyName(name ?? "");
      if (regStatus === "approved") {
        setStatus("approved");
      } else if (regStatus === "rejected") {
        setStatus("rejected");
        setRejectionReason(reason ?? "No reason provided. Please contact MANSCO support.");
      } else {
        setStatus("pending");
      }
    }
    fetchStatus();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D]">
        <RefreshCw className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  // Approved dealers who land here are redirected (shouldn't normally happen)
  if (status === "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D] px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-xl border border-green-500/30 bg-[#1A1A1A] p-8">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-white">Account Approved</h1>
            <p className="mb-6 text-sm text-white/50">
              Your dealer account is active. Click below to access the portal.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#00BFA6] text-sm font-bold text-white transition hover:bg-[#00BFA6]/90"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D] px-4">
        <div className="w-full max-w-md text-center">
          <LogoHeader />
          <div className="rounded-xl border border-red-500/30 bg-[#1A1A1A] p-8">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-white">Registration Rejected</h1>
            <p className="mb-4 text-sm leading-relaxed text-white/50">
              Unfortunately, your dealer registration for{" "}
              {companyName ? (
                <span className="font-semibold text-white/70">{companyName}</span>
              ) : (
                "your company"
              )}{" "}
              has been rejected.
            </p>

            {/* Rejection reason */}
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-left">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-red-400/70">
                Reason
              </p>
              <p className="text-sm text-red-300">{rejectionReason}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-[#111111] px-4 py-3">
                <span className="text-sm text-white/40">Status</span>
                <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                  Rejected
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#111111] px-4 py-3">
                <span className="text-sm text-white/40">Next Steps</span>
                <span className="text-sm font-medium text-white">Contact Support</span>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white/60"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // Default: pending
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D] px-4">
      <div className="w-full max-w-md text-center">
        <LogoHeader />
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <Clock className="h-8 w-8 text-amber-400" />
          </div>

          <h1 className="mb-2 text-xl font-bold text-white">Registration Under Review</h1>
          <p className="mb-6 text-sm leading-relaxed text-white/50">
            Your dealer registration has been submitted successfully. Our team will review your
            application and documents. You&apos;ll receive an email notification once a decision is
            made.
          </p>

          <div className="mb-6 rounded-lg border border-[#2A2A2A] bg-[#111111] p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[#00BFA6]" />
              <div className="text-left">
                <p className="text-sm font-medium text-white">Check your email</p>
                <p className="text-xs text-white/40">
                  We sent a verification link to your email. Please verify to complete the process.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-[#111111] px-4 py-3">
              <span className="text-white/40">Status</span>
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
                Pending Review
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#111111] px-4 py-3">
              <span className="text-white/40">Typical Review Time</span>
              <span className="font-medium text-white">1–2 Business Days</span>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

function LogoHeader() {
  return (
    <div className="mx-auto mb-8 flex items-center justify-center gap-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden">
        <Image
          src="/logo.png"
          alt="MANSCO"
          width={40}
          height={40}
          className="object-contain"
          priority
        />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-bold tracking-[0.1em] text-white">MANSCO</span>
        <span className="text-[10px] font-medium tracking-[0.15em] text-white/50">
          SPARE PARTS PORTAL
        </span>
      </div>
    </div>
  );
}
