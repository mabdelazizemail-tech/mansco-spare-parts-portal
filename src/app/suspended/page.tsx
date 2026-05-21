"use client";

import { ShieldOff, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SuspendedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D] px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <ShieldOff className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Account Suspended</h1>
        <p className="mb-8 text-sm leading-relaxed text-white/50">
          Your dealer account has been suspended by an administrator.
          Please contact MANSCO support for more information.
        </p>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-6 py-2.5 text-sm font-medium text-white/60 transition hover:border-[#3A3A3A] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
