"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Building2,
  CheckCircle,
  AlertCircle,
  FileText,
  BarChart3,
  User,
  Shield,
  TrendingUp,
  Clock,
  Award,
  Eye,
  MessageSquare,
  Share2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface DealerProfile {
  id?: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  city?: string;
  address?: string;
  dealer_type?: string;
  registration_status?: string;
  is_active?: boolean;
  created_at?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata ?? {};
        setUser(session.user);
        setProfile({
          company_name: meta.company_name || "",
          contact_person: meta.contact_person || meta.full_name || "",
          email: session.user.email || "",
          phone: meta.phone || "",
          city: meta.city || "",
          address: meta.address || "",
          dealer_type: meta.dealer_type || meta.role || "",
          registration_status: meta.registration_status || "",
          is_active: meta.is_active !== false,
          created_at: session.user.created_at,
        });
      }
      setLoading(false);
    });
  }, []);

  const getStatusBadge = () => {
    if (!profile) return null;

    if (!profile.is_active) {
      return {
        label: "Suspended",
        color: "bg-red-500/10 text-red-400 border-red-500/30",
        icon: AlertCircle,
      };
    }

    switch (profile.registration_status) {
      case "approved":
        return {
          label: "Active",
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: CheckCircle,
        };
      case "pending":
        return {
          label: "Pending Approval",
          color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
          icon: AlertCircle,
        };
      case "rejected":
        return {
          label: "Rejected",
          color: "bg-red-500/10 text-red-400 border-red-500/30",
          icon: AlertCircle,
        };
      default:
        return {
          label: "Unknown",
          color: "bg-white/5 text-white/40",
          icon: AlertCircle,
        };
    }
  };

  const statusBadge = getStatusBadge();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const accountAge = profile?.created_at
    ? Math.floor(
        (new Date().getTime() - new Date(profile.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => router.back()}
            className="mb-8 flex items-center gap-2 text-[#00BFA6] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="text-white/40">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 text-[#00BFA6] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Profile Header Card */}
        <div className="mb-8 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                  <Building2 className="h-8 w-8 text-[#00BFA6]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {profile?.company_name || "—"}
                  </h1>
                  <p className="mt-1 text-sm text-white/40">
                    {profile?.dealer_type
                      ? profile.dealer_type.charAt(0).toUpperCase() +
                        profile.dealer_type.slice(1).replace("_", " ")
                      : "Dealer"}{" "}
                    Account
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {statusBadge && (
                  <div
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${statusBadge.color}`}
                  >
                    <statusBadge.icon className="h-4 w-4" />
                    {statusBadge.label}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wider text-white/40">
                  Member for
                </p>
                <p className="mt-2 text-lg font-bold text-[#00BFA6]">
                  {accountAge} days
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wider text-white/40">
                  Account Status
                </p>
                <p className="mt-2 text-lg font-bold text-emerald-400">
                  {profile?.is_active ? "Active" : "Suspended"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          {/* Contact Person Card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                <User className="h-5 w-5 text-[#00BFA6]" />
              </div>
              <h2 className="text-lg font-semibold text-white">Contact Info</h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Contact Person
                </p>
                <p className="mt-2 text-white">
                  {profile?.contact_person || "—"}
                </p>
              </div>

              <div className="border-t border-white/10" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Email Address
                </p>
                <div className="mt-2 flex items-center gap-2 text-white">
                  <Mail className="h-4 w-4 text-white/40" />
                  <span className="break-all text-sm">{profile?.email || "—"}</span>
                </div>
              </div>

              {profile?.phone && (
                <>
                  <div className="border-t border-white/10" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                      Phone Number
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-white">
                      <Phone className="h-4 w-4 text-white/40" />
                      {profile.phone}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Company Information Card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                <Building2 className="h-5 w-5 text-[#00BFA6]" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Business Details
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Company Name
                </p>
                <p className="mt-2 text-white">{profile?.company_name || "—"}</p>
              </div>

              {profile?.address && (
                <>
                  <div className="border-t border-white/10" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                      Business Address
                    </p>
                    <div className="mt-2 flex gap-2 text-white">
                      <MapPin className="h-4 w-4 shrink-0 text-white/40 mt-0.5" />
                      <span className="text-sm">{profile.address}</span>
                    </div>
                  </div>
                </>
              )}

              {profile?.city && (
                <>
                  <div className="border-t border-white/10" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                      City
                    </p>
                    <p className="mt-2 text-white">{profile.city}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Account Status Card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                <Shield className="h-5 w-5 text-[#00BFA6]" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Account Details
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Dealer Type
                </p>
                <p className="mt-2 capitalize text-white">
                  {profile?.dealer_type
                    ? profile.dealer_type.replace("_", " ")
                    : "—"}
                </p>
              </div>

              <div className="border-t border-white/10" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Registration Status
                </p>
                <p className="mt-2 capitalize text-white">
                  {profile?.registration_status || "—"}
                </p>
              </div>

              <div className="border-t border-white/10" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Account Status
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      profile?.is_active ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                  <p className="text-white">
                    {profile?.is_active ? "Active" : "Suspended"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline & Verification Section */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Timeline Card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                <Calendar className="h-5 w-5 text-[#00BFA6]" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Account Timeline
              </h2>
            </div>

            <div className="space-y-6">
              <div className="border-l-2 border-[#00BFA6]/30 pl-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Account Created
                </p>
                <p className="mt-1 font-semibold text-white">{memberSince}</p>
                <p className="mt-1 text-xs text-white/40">
                  {accountAge} days ago
                </p>
              </div>

              {profile?.registration_status === "approved" && (
                <div className="border-l-2 border-emerald-500/30 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Approval Date
                  </p>
                  <p className="mt-1 font-semibold text-white">
                    {profile.created_at
                      ? new Date(profile.created_at).toLocaleDateString()
                      : "—"}
                  </p>
                  <p className="mt-1 text-xs text-white/40">Account activated</p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                <Award className="h-5 w-5 text-[#00BFA6]" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Verifications
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-white">Email Verified</span>
                </div>
                <span className="text-xs text-emerald-400">✓</span>
              </div>

              <div
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  profile?.registration_status === "approved"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-yellow-500/20 bg-yellow-500/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {profile?.registration_status === "approved" ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-400" />
                  )}
                  <span
                    className={`text-sm ${
                      profile?.registration_status === "approved"
                        ? "text-white"
                        : "text-white"
                    }`}
                  >
                    Business Verification
                  </span>
                </div>
                <span
                  className={`text-xs ${
                    profile?.registration_status === "approved"
                      ? "text-emerald-400"
                      : "text-yellow-400"
                  }`}
                >
                  {profile?.registration_status === "approved"
                    ? "✓ Verified"
                    : "Pending"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions & Access Card */}
        <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
              <BarChart3 className="h-5 w-5 text-[#00BFA6]" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Permissions & Access Rights
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-400">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">View Spare Parts</span>
              </div>
              <p className="text-xs text-emerald-400/60">
                Search and view available spare parts catalog
              </p>
            </div>

            <div
              className={`rounded-lg border p-4 ${
                profile?.registration_status === "approved"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div
                className={`mb-2 flex items-center gap-2 ${
                  profile?.registration_status === "approved"
                    ? "text-emerald-400"
                    : "text-white/40"
                }`}
              >
                {profile?.registration_status === "approved" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">Place Orders</span>
              </div>
              <p
                className={`text-xs ${
                  profile?.registration_status === "approved"
                    ? "text-emerald-400/60"
                    : "text-white/40"
                }`}
              >
                {profile?.registration_status === "approved"
                  ? "Submit orders for spare parts"
                  : "Available after approval"}
              </p>
            </div>

            <div
              className={`rounded-lg border p-4 ${
                profile?.registration_status === "approved"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div
                className={`mb-2 flex items-center gap-2 ${
                  profile?.registration_status === "approved"
                    ? "text-emerald-400"
                    : "text-white/40"
                }`}
              >
                {profile?.registration_status === "approved" ? (
                  <Share2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">Track Orders</span>
              </div>
              <p
                className={`text-xs ${
                  profile?.registration_status === "approved"
                    ? "text-emerald-400/60"
                    : "text-white/40"
                }`}
              >
                {profile?.registration_status === "approved"
                  ? "Monitor status and delivery"
                  : "Available after approval"}
              </p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-[#00BFA6] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white mb-2">Update Your Profile</p>
              <p className="text-sm text-white/60">
                To update company address, phone number, contact person details,
                or other business information, please contact our support team.
                Changes to account status, approvals, and permissions are
                managed by administrators.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-6 py-2.5 text-sm font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white">
            Contact Support
          </button>
          {profile?.registration_status !== "approved" && (
            <button className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-6 py-2.5 text-sm font-semibold text-yellow-400 transition hover:border-yellow-500/40 hover:bg-yellow-500/20">
              View Account Status
            </button>
          )}
          <button className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-6 py-2.5 text-sm font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white">
            Download Profile
          </button>
        </div>
      </div>
    </div>
  );
}
