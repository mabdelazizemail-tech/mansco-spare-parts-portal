"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/portal/status-badge";
import { PartThumbnail } from "@/components/parts/part-thumbnail";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Package,
  Truck,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ShieldAlert,
} from "lucide-react";

type ToneColor = "success" | "warning" | "destructive" | "info" | "muted" | "accent";

function statusTone(status: string): ToneColor {
  const map: Record<string, ToneColor> = {
    submitted: "info", under_review: "warning", approved: "success",
    rejected: "destructive", done: "success", partial: "warning",
    back_ordered: "accent", invoiced: "info", shipped: "info",
    delivered: "success", cancelled: "destructive",
    pending: "muted", confirmed: "success", backordered: "accent",
    pending_dealer_confirmation: "warning",
  };
  return map[status] ?? "muted";
}

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const typeTone: Record<string, ToneColor> = { daily: "info", air_dhl: "warning", stock: "accent" };
const typeLabel: Record<string, string> = { daily: "Daily", air_dhl: "Air / DHL", stock: "Stock" };

function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

type OrderLine = {
  id: string;
  part_number: string;
  part_name: string;
  part_name_ar?: string;
  quantity_requested: number;
  quantity_confirmed: number;
  quantity_backordered: number;
  unit_price: number;
  line_total: number;
  line_status: string;
  backorder_eta?: string | null;
};

type TimelineEvent = {
  id: string;
  event: string;
  status?: string;
  actor?: string;
  notes?: string;
  created_at: string;
};

type OrderDetail = {
  id: string;
  order_number: string;
  dealer_id: string;
  order_type: string;
  status: string;
  submitted_at: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  financial_block: boolean;
  financial_block_reason?: string;
  eta_calculated?: string;
  eta_actual?: string;
  invoice_number?: string;
  tracking_number?: string;
  carrier?: string;
  order_lines: OrderLine[];
  order_timeline: TimelineEvent[];
  order_approvals: { id: string; action: string; notes?: string; decided_at: string; reviewer_id: string }[];
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewAction, setReviewAction] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [dealerName, setDealerName] = useState<string | null>(null);
  // ── Phase 2: admin propose-edits + dealer accept/reject ──
  const [proposeMode, setProposeMode] = useState(false);
  const [proposedQty, setProposedQty] = useState<Record<string, number>>({});
  const [dealerActionLoading, setDealerActionLoading] = useState(false);
  const [dealerActionError, setDealerActionError] = useState("");

  // Get user role from session
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserRole(user?.user_metadata?.role ?? null);
    };
    getUser();
  }, []);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Order not found");
      const body = await res.json();
      setOrder(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Resolve dealer name from dealer_id (UUID or code)
  useEffect(() => {
    if (!order?.dealer_id) {
      setDealerName(null);
      return;
    }
    const dealerId = order.dealer_id;
    const supabase = createClient();
    // Try lookup by id (UUID) first, then by code
    supabase
      .from("dealers")
      .select("company_name")
      .eq("id", dealerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.company_name) {
          setDealerName(data.company_name);
        } else {
          // Fallback: try by code
          supabase
            .from("dealers")
            .select("company_name")
            .eq("code", dealerId)
            .maybeSingle()
            .then(({ data: byCode }) => {
              setDealerName(byCode?.company_name ?? null);
            });
        }
      });
  }, [order?.dealer_id]);

  const handleReview = async (action: string) => {
    if (!order) return;
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewer_id: "admin", notes: reviewNotes || undefined }),
      });
      if (res.ok) {
        setReviewAction(null);
        setReviewNotes("");
        fetchOrder();
      }
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Admin: propose per-line quantity edits and send back to dealer ──
  const enterProposeMode = () => {
    if (!order) return;
    // Default each proposed qty to the originally requested qty so admin only
    // needs to change what's different.
    const seed: Record<string, number> = {};
    for (const line of order.order_lines) {
      seed[line.id] = line.quantity_requested;
    }
    setProposedQty(seed);
    setProposeMode(true);
  };

  const handleProposeEdits = async () => {
    if (!order) return;
    setReviewLoading(true);
    try {
      const line_proposals = order.order_lines.map((l) => ({
        line_id: l.id,
        quantity_proposed: proposedQty[l.id] ?? l.quantity_requested,
      }));
      const res = await fetch(`/api/orders/${order.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "propose_edits",
          reviewer_id: "admin",
          notes: reviewNotes || undefined,
          line_proposals,
        }),
      });
      if (res.ok) {
        setProposeMode(false);
        setReviewNotes("");
        fetchOrder();
      }
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Dealer: accept/reject the admin's proposed edits ──
  const handleDealerConfirm = async (action: "accept" | "reject") => {
    if (!order) return;
    setDealerActionLoading(true);
    setDealerActionError("");
    try {
      const res = await fetch(`/api/orders/${order.id}/dealer-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: action === "reject" ? reviewNotes || undefined : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.message || "Action failed");
      }
      setReviewNotes("");
      fetchOrder();
    } catch (e) {
      setDealerActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setDealerActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Package className="h-12 w-12 text-white/10" />
        <p className="text-white/40">{error || "Order not found"}</p>
        <Link href="/dashboard/orders">
          <Button variant="outline" size="sm">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  const isUnderReview = order.status === "under_review" || order.status === "submitted";
  const isPendingDealerConfirmation = order.status === "pending_dealer_confirmation";
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const isDealer = userRole === "dealer" || userRole === "sub_dealer";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/orders")} className="text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white font-mono">{order.order_number}</h1>
            <StatusBadge tone={statusTone(order.status)} label={statusLabel(order.status)} />
            <StatusBadge tone={typeTone[order.order_type] ?? "muted"} label={typeLabel[order.order_type] ?? order.order_type} />
          </div>
          <p className="text-sm text-white/40 mt-1">
            Placed {new Date(order.submitted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Financial block warning */}
      {order.financial_block && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
          <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-400">Financial Block</p>
            <p className="text-xs text-red-400/70">{order.financial_block_reason}</p>
          </div>
        </div>
      )}

      {/* Under review */}
      {isUnderReview && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">Pending Admin Review</p>
            <p className="text-xs text-yellow-400/70">
              {isAdmin
                ? "Review this order. You can approve as-is, reject, or propose per-line quantity changes and send back to the dealer."
                : "This order is waiting for an admin to review. You'll be notified if they propose any changes."}
            </p>
          </div>
        </div>
      )}

      {/* Pending dealer confirmation — admin has proposed edits */}
      {isPendingDealerConfirmation && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-400">
              {isDealer ? "Admin Proposed Changes — Action Required" : "Awaiting Dealer Confirmation"}
            </p>
            <p className="text-xs text-amber-400/70">
              {isDealer
                ? "An admin has proposed quantity changes to your order. Review the proposed quantities below and accept or reject."
                : "The dealer has been notified of the proposed changes and must accept or reject before processing continues."}
            </p>
          </div>
        </div>
      )}

      {/* Rejection */}
      {order.status === "rejected" && order.rejection_reason && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
          <XCircle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-400">Rejected</p>
            <p className="text-xs text-red-400/70">{order.rejection_reason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Lines */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="border-b border-[#2A2A2A] px-5 py-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-white/40" /> Order Lines ({order.order_lines.length})
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Part</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-white/40 uppercase">Qty</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase">Line Status</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase">Unit Price</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-white/40 uppercase">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.order_lines.map((line) => (
                  <tr key={line.id} className="border-b border-[#2A2A2A]/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <PartThumbnail src={null} alt={line.part_name} size="sm" />
                        <div>
                          <p className="font-medium text-white">{line.part_name}</p>
                          <p className="font-mono text-xs text-white/30">{line.part_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {/* Admin in propose-edits mode: show editable qty input */}
                      {proposeMode && isAdmin ? (
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={proposedQty[line.id] ?? line.quantity_requested}
                            onChange={(e) =>
                              setProposedQty((p) => ({
                                ...p,
                                [line.id]: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="h-8 w-20 rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-center text-sm text-white focus:border-[#00BFA6] focus:outline-none"
                          />
                          <span className="text-[10px] text-white/40">requested: {line.quantity_requested}</span>
                        </div>
                      ) : isPendingDealerConfirmation ? (
                        // Dealer-confirmation state: show requested vs proposed comparison
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-sm ${line.quantity_confirmed !== line.quantity_requested ? "text-amber-400 font-semibold" : "text-white"}`}>
                            {line.quantity_confirmed}
                          </span>
                          {line.quantity_confirmed !== line.quantity_requested && (
                            <span className="text-[10px] text-white/40 line-through">requested: {line.quantity_requested}</span>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="text-white">{line.quantity_requested}</span>
                          {line.quantity_confirmed > 0 && line.quantity_confirmed < line.quantity_requested && (
                            <span className="block text-[10px] text-yellow-400">{line.quantity_confirmed} confirmed</span>
                          )}
                          {line.quantity_backordered > 0 && (
                            <span className="block text-[10px] text-blue-400">{line.quantity_backordered} backordered</span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={statusTone(line.line_status)} label={statusLabel(line.line_status)} />
                    </td>
                    <td className="px-5 py-3 text-right text-white/70">{formatEGP(line.unit_price)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-white">{formatEGP(line.line_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#2A2A2A]">
                  <td colSpan={4} className="px-5 py-3 text-right text-sm text-white/50">Subtotal</td>
                  <td className="px-5 py-3 text-right font-bold text-white">{formatEGP(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-5 py-2 text-right text-sm text-white/50">VAT (14%)</td>
                  <td className="px-5 py-2 text-right text-white/70">{formatEGP(order.vat_amount)}</td>
                </tr>
                <tr className="border-t border-[#2A2A2A]">
                  <td colSpan={4} className="px-5 py-3 text-right text-sm font-semibold text-white">Total</td>
                  <td className="px-5 py-3 text-right text-lg font-bold text-white">{formatEGP(order.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Shipment Info */}
          {order.tracking_number && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <Truck className="h-4 w-4 text-white/40" /> Shipment
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/40">Carrier</p>
                  <p className="text-white font-medium">{order.carrier ?? "MANSCO Fleet"}</p>
                </div>
                <div>
                  <p className="text-white/40">Tracking #</p>
                  <p className="text-[#00BFA6] font-mono text-xs">{order.tracking_number}</p>
                </div>
              </div>
            </div>
          )}

          {/* Invoice */}
          {order.invoice_number && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-white/40" /> Invoice
              </h3>
              <p className="text-sm text-white/60">
                Invoice: <span className="font-mono text-white">{order.invoice_number}</span>
              </p>
            </div>
          )}

          {/* Admin Review Actions — Only visible to admins, only while under_review */}
          {isUnderReview && isAdmin && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4">
              <h3 className="font-semibold text-white">Review Actions</h3>

              {proposeMode ? (
                <div className="space-y-3">
                  <p className="text-sm text-white/60">
                    Adjust the quantities above to match what you can actually fulfil. The dealer will see your proposed quantities and must accept or reject before the order proceeds.
                  </p>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Optional note to the dealer (e.g. 'replaced with equivalent part')..."
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] p-3 text-sm text-white placeholder:text-white/30 min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleProposeEdits}
                      disabled={reviewLoading}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {reviewLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                      Send to Dealer for Confirmation
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setProposeMode(false); setReviewNotes(""); }}
                      className="border-[#2A2A2A] text-white/60"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : reviewAction ? (
                <div className="space-y-3">
                  <p className="text-sm text-white/60">
                    {reviewAction === "approve"
                      ? "Approve this order as-is (no edits)?"
                      : reviewAction === "reject"
                      ? "Reject this order?"
                      : "Partially approve?"}
                  </p>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={reviewAction === "reject" ? "Rejection reason (required)..." : "Notes (optional)..."}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] p-3 text-sm text-white placeholder:text-white/30 min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleReview(reviewAction)}
                      disabled={reviewLoading || (reviewAction === "reject" && !reviewNotes)}
                      className={
                        reviewAction === "approve"
                          ? "bg-green-600 hover:bg-green-700"
                          : reviewAction === "reject"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-yellow-600 hover:bg-yellow-700"
                      }
                    >
                      {reviewLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                      Confirm {statusLabel(reviewAction)}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setReviewAction(null); setReviewNotes(""); }} className="border-[#2A2A2A] text-white/60">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <Button className="gap-2 bg-amber-600 hover:bg-amber-700" onClick={enterProposeMode}>
                      <FileText className="h-4 w-4" /> Propose Edits & Send to Dealer
                    </Button>
                    <Button variant="outline" className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => setReviewAction("approve")}>
                      <CheckCircle className="h-4 w-4" /> Approve As-Is
                    </Button>
                    <Button variant="outline" className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setReviewAction("reject")}>
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                  <p className="text-xs text-white/40">
                    <strong className="text-amber-400">Propose Edits</strong> lets you adjust per-line quantities and send back to the dealer for final confirmation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Dealer Confirmation Actions — visible only while pending_dealer_confirmation */}
          {isPendingDealerConfirmation && isDealer && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
              <h3 className="font-semibold text-white">Confirm Admin's Proposed Changes</h3>
              <p className="text-sm text-white/60">
                Review the proposed quantities in the order lines above. Accept to confirm the order at the adjusted quantities, or reject to cancel.
              </p>

              {/* Optional rejection note */}
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Optional: reason for rejection (helps the admin understand)..."
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] p-3 text-sm text-white placeholder:text-white/30 min-h-[60px]"
              />

              {dealerActionError && (
                <p className="text-xs text-red-400">{dealerActionError}</p>
              )}

              <div className="flex gap-3">
                <Button
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => handleDealerConfirm("accept")}
                  disabled={dealerActionLoading}
                >
                  {dealerActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  <CheckCircle className="h-4 w-4" /> Accept & Confirm Order
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => handleDealerConfirm("reject")}
                  disabled={dealerActionLoading}
                >
                  <XCircle className="h-4 w-4" /> Reject & Cancel Order
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Info */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-3">
            <h3 className="font-semibold text-white">Order Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Dealer</span>
                <span className="text-white text-sm">{dealerName ?? order.dealer_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Type</span>
                <span className="text-white">{typeLabel[order.order_type] ?? order.order_type}</span>
              </div>
              {order.eta_calculated && (
                <div className="flex justify-between">
                  <span className="text-white/40">Est. Delivery</span>
                  <span className="text-white">
                    {new Date(order.eta_calculated).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              )}
              {order.notes && (
                <div className="pt-2 border-t border-[#2A2A2A]">
                  <span className="text-white/40 text-xs">Notes</span>
                  <p className="text-white/60 text-xs mt-1">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-white/40" /> Timeline
            </h3>
            {order.order_timeline.length === 0 ? (
              <p className="text-xs text-white/30">No events yet</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-[#2A2A2A]" />
                <div className="space-y-5">
                  {order.order_timeline.map((event, i) => (
                    <div key={event.id} className="flex gap-3 relative">
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                          i === order.order_timeline.length - 1
                            ? "bg-[#00BFA6] text-white"
                            : "bg-[#2A2A2A] text-white/40"
                        }`}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{event.event}</p>
                        <p className="text-[11px] text-white/40">
                          {new Date(event.created_at).toLocaleString("en-GB")}
                        </p>
                        {event.notes && (
                          <p className="text-xs text-white/30 mt-0.5">{event.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
