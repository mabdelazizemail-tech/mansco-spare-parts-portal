"use client";

import Link from "next/link";
import { FileText, Plus } from "lucide-react";

export function WelcomeBanner() {
  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/30">
          Dealer Workspace
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Welcome back, Karim</h1>
        <p className="mt-1 text-sm text-white/40">
          CAI-001 &middot; Master &middot; Cairo
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/parts"
          className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:border-[#3A3A3A]"
        >
          <FileText className="h-4 w-4" />
          Parts Inquiry
        </Link>
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-white/20 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:border-white/40"
        >
          <Plus className="h-4 w-4" />
          New Order
        </Link>
      </div>
    </div>
  );
}
