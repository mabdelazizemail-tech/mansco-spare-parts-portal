"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Check,
  X,
  Clock,
  Building2,
  Mail,
  Phone,
  FileText,
  MapPin,
  User,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  Download,
  ExternalLink,
} from "lucide-react";

type Registration = {
  id: string;
  email: string;
  company_name: string;
  contact_person: string;
  phone: string;
  tax_id: string;
  commercial_register_number: string;
  branch_address: string;
  dealer_type_requested: string;
  parent_dealer_code: string | null;
  review_status: "pending" | "approved" | "rejected";
  submitted_at: string;
  documents_uploaded: Record<string, string>;
};

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState("");
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const openDocPreview = async (docPath: string, label: string) => {
    setPreviewLoading(docPath);
    try {
      const res = await fetch(`/api/registration/documents?path=${encodeURIComponent(docPath)}`);
      if (!res.ok) throw new Error("Failed to get document URL");
      const body = await res.json();
      setPreviewUrl(body.data.url);
      setPreviewLabel(label);
    } catch {
      setError("Failed to load document preview");
    } finally {
      setPreviewLoading(null);
    }
  };

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/registration/list");
      if (!res.ok) throw new Error("Failed to fetch");
      const body = await res.json();
      const data: Registration[] = body.data ?? [];
      setRegistrations(data);
      if (data.length > 0 && !selectedId) {
        const firstPending = data.find((r) => r.review_status === "pending");
        setSelectedId(firstPending?.id ?? data[0].id);
      }
    } catch {
      setError("Failed to load registrations");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchRegistrations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = registrations.filter((r) => r.review_status === "pending");
  const approved = registrations.filter((r) => r.review_status === "approved");
  const rejected = registrations.filter((r) => r.review_status === "rejected");
  const selected = registrations.find((r) => r.id === selectedId);

  const handleAction = async (action: "approve" | "reject") => {
    if (!selected) return;

    if (action === "reject" && !showRejectModal) {
      setShowRejectModal(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/registration/${selected.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejection_reason: rejectionReason || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message || `Failed to ${action} registration`);
      } else {
        await fetchRegistrations();
        setShowRejectModal(false);
        setRejectionReason("");
        const remaining = pending.filter((r) => r.id !== selected.id);
        setSelectedId(remaining[0]?.id ?? null);
      }
    } catch {
      setError(`Failed to ${action} registration`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Shield className="h-6 w-6 text-[#00BFA6]" />
            Dealer Registrations
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Review and approve new dealer registration applications.
          </p>
        </div>
        <button
          onClick={fetchRegistrations}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{pending.length}</p>
        </div>
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Approved</p>
          <p className="mt-1 text-2xl font-bold text-green-400">{approved.length}</p>
        </div>
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{rejected.length}</p>
        </div>
      </div>

      {loading && registrations.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      ) : registrations.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16 text-center text-white/30">
          No registrations yet. New dealer signups will appear here.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Queue */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-bold text-white">
              {pending.length > 0 ? "Pending Queue" : "All Registrations"}
            </h2>
            <div className="space-y-2">
              {(pending.length > 0 ? pending : registrations).map((reg) => (
                <button
                  key={reg.id}
                  onClick={() => setSelectedId(reg.id)}
                  className={`w-full rounded-xl border bg-[#1A1A1A] p-4 text-left transition-all ${
                    selectedId === reg.id
                      ? "border-l-4 border-l-[#00BFA6] border-t-[#2A2A2A] border-r-[#2A2A2A] border-b-[#2A2A2A]"
                      : "border-[#2A2A2A] hover:border-[#3A3A3A]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{reg.company_name}</p>
                      <p className="text-xs text-white/40">{reg.contact_person}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        reg.review_status === "approved"
                          ? "bg-green-500/20 text-green-400"
                          : reg.review_status === "rejected"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {/* FIX (G6): Always show the review status in the badge, not the dealer type */}
                    {reg.review_status === "approved"
                      ? "Approved"
                      : reg.review_status === "rejected"
                      ? "Rejected"
                      : reg.dealer_type_requested === "sub_dealer"
                      ? "Sub-Dealer"
                      : "Pending"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-white/30">
                    <Clock className="h-3 w-3" />
                    {new Date(reg.submitted_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-white/40">
                  Registration Detail
                </h3>
                <p className="text-lg font-bold text-white">{selected.company_name}</p>

                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow icon={User} label="Contact" value={selected.contact_person} />
                    <InfoRow icon={Mail} label="Email" value={selected.email} />
                    <InfoRow icon={Phone} label="Phone" value={selected.phone} />
                    <InfoRow
                      icon={Building2}
                      label="Type"
                      value={
                        selected.dealer_type_requested === "sub_dealer"
                          ? "Sub-Dealer"
                          : "Dealer"
                      }
                    />
                    <InfoRow icon={FileText} label="Tax ID" value={selected.tax_id} />
                    <InfoRow
                      icon={FileText}
                      label="CR Number"
                      value={selected.commercial_register_number}
                    />
                  </div>
                  <InfoRow icon={MapPin} label="Address" value={selected.branch_address} />

                  {selected.parent_dealer_code && (
                    <InfoRow
                      icon={Building2}
                      label="Parent Dealer"
                      value={selected.parent_dealer_code}
                    />
                  )}

                  {/* Documents */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/40">
                      Uploaded Documents
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        { key: "trade_license", label: "Trade License" },
                        { key: "tax_card", label: "Tax Card" },
                        { key: "commercial_register_doc", label: "CR Document" },
                      ].map(({ key, label }) => {
                        const docPath = selected.documents_uploaded?.[key];
                        return (
                          <button
                            key={key}
                            disabled={!docPath}
                            onClick={() => docPath && openDocPreview(docPath, label)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition ${
                              docPath
                                ? "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 cursor-pointer"
                                : "border-red-500/30 bg-red-500/10 text-red-400 cursor-not-allowed"
                            }`}
                          >
                            {previewLoading === docPath ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : docPath ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5" />
                            )}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions — only show for pending */}
                {selected.review_status === "pending" && (
                  <>
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => handleAction("approve")}
                        disabled={actionLoading}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        Approve Dealer
                      </button>
                      <button
                        onClick={() => handleAction("reject")}
                        disabled={actionLoading}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>

                    {showRejectModal && (
                      <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                        <p className="mb-2 text-sm font-semibold text-red-400">
                          Rejection Reason
                        </p>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Explain why this registration is being rejected..."
                          className="mb-3 h-24 w-full resize-none rounded-lg border border-red-500/30 bg-[#111111] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowRejectModal(false);
                              setRejectionReason("");
                            }}
                            className="flex-1 rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-white/60 hover:bg-[#2A2A2A]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAction("reject")}
                            disabled={!rejectionReason.trim()}
                            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selected.review_status !== "pending" && (
                  <div
                    className={`mt-6 rounded-lg border p-3 text-center text-sm font-semibold ${
                      selected.review_status === "approved"
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}
                  >
                    This registration has been{" "}
                    {selected.review_status === "approved" ? "approved" : "rejected"}.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-white/30">
                Select a registration to review
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-[#00BFA6]" />
                <h3 className="text-sm font-bold text-white">{previewLabel}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs font-medium text-white/60 transition hover:bg-[#2A2A2A] hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
                <a
                  href={previewUrl}
                  download
                  className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs font-medium text-white/60 transition hover:bg-[#2A2A2A] hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                <button
                  onClick={() => { setPreviewUrl(null); setPreviewLabel(""); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-[#2A2A2A] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Preview Content */}
            <div className="flex-1 overflow-hidden">
              {previewUrl.match(/\.(pdf)/i) ? (
                <iframe
                  src={previewUrl}
                  title={previewLabel}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center overflow-auto p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={previewLabel}
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-[#111111] px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
          {label}
        </p>
        <p className="text-sm text-white">{value}</p>
      </div>
    </div>
  );
}
