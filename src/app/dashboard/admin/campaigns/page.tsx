"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Loader2,
  RefreshCw,
  Megaphone,
  Calendar,
  Percent,
  Tag,
  Eye,
  Edit,
  Copy,
  Play,
  Pause,
  CheckCircle2,
  Archive,
  Trash2,
  BarChart3,
  Users,
  ShoppingCart,
  X,
  AlertTriangle,
  FileEdit,
  ArrowRight,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  status: string;
  start_date: string;
  end_date: string;
  target_audience: string;
  target_dealer_group: string | null;
  eligibility_rules: Record<string, unknown>;
  created_at: string;
  campaign_items: { count: number }[];
};

const statusStyles: Record<string, string> = {
  draft: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  archived: "bg-zinc-500/20 text-zinc-500 border-zinc-600/30",
};

const typeLabels: Record<string, string> = {
  discount: "Discount",
  bundled_offer: "Bundled Offer",
  seasonal_promotion: "Seasonal",
  target_incentive: "Target Incentive",
};

const typeStyles: Record<string, string> = {
  discount: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  bundled_offer: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  seasonal_promotion: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  target_incentive: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getDaysRemaining(endDate: string) {
  const diff = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

const STATUS_TABS = ["all", "draft", "active", "paused", "completed", "archived"] as const;

// Lifecycle pipeline stages (in order)
const LIFECYCLE_STAGES = [
  { key: "draft", label: "Draft", icon: FileEdit, color: "zinc" },
  { key: "active", label: "Active", icon: Play, color: "emerald" },
  { key: "paused", label: "Paused", icon: Pause, color: "amber" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "blue" },
  { key: "archived", label: "Archived", icon: Archive, color: "zinc" },
] as const;

// Allowed transitions per lifecycle status
const ALLOWED_TRANSITIONS: Record<string, { status: string; label: string; tone: "primary" | "warn" | "neutral" | "danger" }[]> = {
  draft: [
    { status: "active", label: "Activate", tone: "primary" },
  ],
  active: [
    { status: "paused", label: "Pause", tone: "warn" },
    { status: "completed", label: "Complete", tone: "neutral" },
  ],
  paused: [
    { status: "active", label: "Resume", tone: "primary" },
    { status: "completed", label: "Complete", tone: "neutral" },
  ],
  completed: [
    { status: "archived", label: "Archive", tone: "neutral" },
  ],
  archived: [],
};

const transitionCopy: Record<string, { title: string; description: string; cta: string; requireReason: boolean }> = {
  active: {
    title: "Activate Campaign",
    description: "This will make the campaign visible to all targeted dealers and apply its rules immediately.",
    cta: "Activate",
    requireReason: false,
  },
  paused: {
    title: "Pause Campaign",
    description: "Dealers will no longer see this campaign. You can resume it later. Existing orders are not affected.",
    cta: "Pause",
    requireReason: true,
  },
  completed: {
    title: "Mark as Completed",
    description: "This finalizes the campaign. It cannot be reactivated, but performance data remains available.",
    cta: "Complete",
    requireReason: false,
  },
  archived: {
    title: "Archive Campaign",
    description: "The campaign will be hidden from active views. Historical data is preserved for reporting.",
    cta: "Archive",
    requireReason: false,
  },
};

// ── Lifecycle Transition Modal ─────────────────────────────────────────
function LifecycleTransitionModal({
  campaign,
  targetStatus,
  onClose,
  onConfirm,
  loading,
}: {
  campaign: Campaign;
  targetStatus: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const copy = transitionCopy[targetStatus] || {
    title: "Change Status",
    description: "Update campaign status.",
    cta: "Confirm",
    requireReason: false,
  };

  const canConfirm = !copy.requireReason || reason.trim().length >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#111111] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white">{copy.title}</h2>
            <p className="text-xs text-white/40 mt-0.5">{campaign.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:bg-[#2A2A2A] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status transition visual */}
          <div className="flex items-center justify-center gap-3 rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] p-3">
            <Badge
              variant="outline"
              className={`${statusStyles[campaign.status] ?? ""} uppercase text-[10px] font-semibold`}
            >
              {campaign.status}
            </Badge>
            <ArrowRight className="h-4 w-4 text-white/40" />
            <Badge
              variant="outline"
              className={`${statusStyles[targetStatus] ?? ""} uppercase text-[10px] font-semibold`}
            >
              {targetStatus}
            </Badge>
          </div>

          <p className="text-sm text-white/60">{copy.description}</p>

          {copy.requireReason && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                Reason {copy.requireReason && <span className="text-red-400">*</span>}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Why are you changing this status?"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none resize-none"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#2A2A2A] px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white/60 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading || !canConfirm}
            className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-4 py-2 text-xs font-semibold text-black hover:bg-[#00BFA6]/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {copy.cta}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function AdminCampaignsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingTransition, setPendingTransition] = useState<{
    campaign: Campaign;
    targetStatus: string;
  } | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const body = await res.json();
      setCampaigns(body.data ?? []);
    } catch {
      setError("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const filtered = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const doStatusChange = async (id: string, newStatus: string, reason = "") => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/campaigns/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      if (!res.ok) {
        const b = await res.json();
        alert(b.error?.message || "Failed");
        return;
      }
      await fetchCampaigns();
      setPendingTransition(null);
    } finally {
      setActionLoading(null);
    }
  };

  const requestTransition = (campaign: Campaign, targetStatus: string) => {
    setPendingTransition({ campaign, targetStatus });
  };

  const doDuplicate = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/campaigns/${id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        alert("Failed to duplicate");
        return;
      }
      const body = await res.json();
      router.push(`/dashboard/admin/campaigns/${body.data.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const doDelete = async (id: string) => {
    if (!confirm("Delete this draft campaign?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json();
        alert(b.error?.message || "Failed");
        return;
      }
      await fetchCampaigns();
    } finally {
      setActionLoading(null);
    }
  };

  // Stats
  const total = campaigns.length;
  const active = campaigns.filter((c) => c.status === "active").length;
  const totalItems = campaigns.reduce(
    (s, c) => s + (c.campaign_items?.[0]?.count ?? 0),
    0
  );

  // Lifecycle counts (always reflects all loaded campaigns)
  const lifecycleCounts: Record<string, number> = {
    all: campaigns.length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    active: campaigns.filter((c) => c.status === "active").length,
    paused: campaigns.filter((c) => c.status === "paused").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    archived: campaigns.filter((c) => c.status === "archived").length,
  };

  // Expiring / expired actives (auto-complete suggestion candidates)
  const expiringActive = campaigns.filter(
    (c) => c.status === "active" && getDaysRemaining(c.end_date) <= 7 && getDaysRemaining(c.end_date) > 0
  ).length;
  const expiredActive = campaigns.filter(
    (c) => c.status === "active" && getDaysRemaining(c.end_date) <= 0
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Campaign Manager
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Create, manage, and track marketing campaigns and promotions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCampaigns}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => router.push("/dashboard/admin/reports/discounts")}
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-xs font-semibold text-emerald-400 transition hover:border-emerald-500/50 hover:bg-emerald-500/10"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Discount Analytics
          </button>
          <button
            onClick={() => router.push("/dashboard/admin/campaigns/new")}
            className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#00BFA6]/90"
          >
            <Plus className="h-3.5 w-3.5" />
            New Campaign
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-[#00BFA6]/10 p-3">
              <Megaphone className="h-5 w-5 text-[#00BFA6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{total}</p>
              <p className="text-xs uppercase tracking-wider text-white/40">Total Campaigns</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <Play className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{active}</p>
              <p className="text-xs uppercase tracking-wider text-white/40">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-violet-500/10 p-3">
              <Tag className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-400">{totalItems}</p>
              <p className="text-xs uppercase tracking-wider text-white/40">Campaign Items</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle Pipeline */}
      <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base text-white">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#00BFA6]" />
              Campaign Lifecycle Pipeline
            </span>
            <span className="text-xs font-normal text-white/40">
              Click any stage to filter
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const StageIcon = stage.icon;
              const count = lifecycleCounts[stage.key] ?? 0;
              const isActive = statusFilter === stage.key;
              const colorClasses: Record<string, { bg: string; text: string; ring: string; border: string }> = {
                zinc: { bg: "bg-zinc-500/10", text: "text-zinc-400", ring: "ring-zinc-500/50", border: "border-zinc-500/30" },
                emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/50", border: "border-emerald-500/30" },
                amber: { bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/50", border: "border-amber-500/30" },
                blue: { bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/50", border: "border-blue-500/30" },
              };
              const c = colorClasses[stage.color];
              return (
                <div key={stage.key} className="flex flex-1 items-center">
                  <button
                    onClick={() => setStatusFilter(stage.key)}
                    className={`flex flex-1 flex-col items-center gap-2 rounded-lg border ${c.border} ${c.bg} px-3 py-3 transition hover:ring-2 ${c.ring} ${
                      isActive ? `ring-2 ${c.ring}` : ""
                    }`}
                  >
                    <div className={`flex items-center gap-2 ${c.text}`}>
                      <StageIcon className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {stage.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-bold ${c.text}`}>{count}</span>
                      <span className="text-[10px] text-white/30">
                        {total > 0 ? `${((count / total) * 100).toFixed(0)}%` : "0%"}
                      </span>
                    </div>
                  </button>
                  {idx < LIFECYCLE_STAGES.length - 1 && (
                    <ArrowRight className="hidden md:block h-4 w-4 text-white/20 mx-1 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Lifecycle alerts */}
          {(expiringActive > 0 || expiredActive > 0) && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {expiringActive > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <Clock className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-400">
                      {expiringActive} campaign{expiringActive > 1 ? "s" : ""} expiring soon
                    </p>
                    <p className="text-[10px] text-amber-400/60 mt-0.5">
                      Active campaigns ending within 7 days
                    </p>
                  </div>
                </div>
              )}
              {expiredActive > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-400">
                      {expiredActive} expired campaign{expiredActive > 1 ? "s" : ""} still active
                    </p>
                    <p className="text-[10px] text-red-400/60 mt-0.5">
                      Past end date — should be marked completed
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Tabs + Search */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white">All Campaigns</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 border-[#2A2A2A] bg-[#111111] ps-9 text-white placeholder:text-white/30"
              />
            </div>
          </div>
          {/* Status filter tabs with counts */}
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map((tab) => {
              const count = lifecycleCounts[tab] ?? 0;
              const isActive = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {tab}
                  <span
                    className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      isActive ? "bg-[#00BFA6]/20 text-[#00BFA6]" : "bg-white/5 text-white/40"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {loading && campaigns.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-white/30" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-white/30">
              {campaigns.length === 0
                ? "No campaigns yet. Click \"New Campaign\" to create one."
                : "No campaigns match your search."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#2A2A2A]">
                  <TableHead className="text-white/40">Campaign</TableHead>
                  <TableHead className="text-white/40">Type</TableHead>
                  <TableHead className="text-white/40">Status</TableHead>
                  <TableHead className="text-white/40">Period</TableHead>
                  <TableHead className="text-center text-white/40">Items</TableHead>
                  <TableHead className="text-white/40">Audience</TableHead>
                  <TableHead className="text-end text-white/40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const daysLeft = getDaysRemaining(c.end_date);
                  const itemCount = c.campaign_items?.[0]?.count ?? 0;
                  const isActionLoading = actionLoading === c.id;
                  return (
                    <TableRow key={c.id} className="border-[#2A2A2A]">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-white">{c.name}</p>
                          <p className="mt-0.5 max-w-xs truncate text-xs text-white/40">
                            {c.description || "No description"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${typeStyles[c.campaign_type] ?? "border-[#2A2A2A] text-white/40"} text-[10px] uppercase font-semibold`}
                        >
                          {typeLabels[c.campaign_type] ?? c.campaign_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${statusStyles[c.status] ?? ""} text-[10px] uppercase font-semibold`}
                        >
                          {c.status}
                        </Badge>
                        {c.status === "active" && daysLeft <= 7 && daysLeft > 0 && (
                          <p className="mt-1 text-[10px] text-amber-400">
                            {daysLeft}d remaining
                          </p>
                        )}
                        {c.status === "active" && daysLeft <= 0 && (
                          <p className="mt-1 text-[10px] text-red-400">Expired</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-white/60">
                          <p>{formatDate(c.start_date)}</p>
                          <p className="text-white/30">to {formatDate(c.end_date)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm text-white">{itemCount}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs capitalize text-white/60">
                          {c.target_audience === "all"
                            ? "All Dealers"
                            : c.target_dealer_group || c.target_audience}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {isActionLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                          ) : (
                            <>
                              {/* View / Performance */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-white/40 hover:text-white"
                                onClick={() => router.push(`/dashboard/admin/campaigns/${c.id}`)}
                                title="View details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              {/* Edit (draft/active/paused) */}
                              {["draft", "active", "paused"].includes(c.status) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-white/40 hover:text-white"
                                  onClick={() => router.push(`/dashboard/admin/campaigns/${c.id}/edit`)}
                                  title="Edit campaign"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {/* Status actions */}
                              {c.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-emerald-400/60 hover:text-emerald-400"
                                  onClick={() => requestTransition(c, "active")}
                                  title="Activate"
                                >
                                  <Play className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {c.status === "active" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-amber-400/60 hover:text-amber-400"
                                  onClick={() => requestTransition(c, "paused")}
                                  title="Pause"
                                >
                                  <Pause className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {c.status === "paused" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-emerald-400/60 hover:text-emerald-400"
                                  onClick={() => requestTransition(c, "active")}
                                  title="Resume"
                                >
                                  <Play className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {["active", "paused"].includes(c.status) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-blue-400/60 hover:text-blue-400"
                                  onClick={() => requestTransition(c, "completed")}
                                  title="Mark completed"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {c.status === "completed" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-white/40 hover:text-white"
                                  onClick={() => requestTransition(c, "archived")}
                                  title="Archive"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {/* Duplicate */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-white/40 hover:text-white"
                                onClick={() => doDuplicate(c.id)}
                                title="Duplicate"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>

                              {/* Delete (draft only) */}
                              {c.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-red-400/60 hover:text-red-400"
                                  onClick={() => doDelete(c.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Lifecycle Transition Modal */}
      {pendingTransition && (
        <LifecycleTransitionModal
          campaign={pendingTransition.campaign}
          targetStatus={pendingTransition.targetStatus}
          loading={actionLoading === pendingTransition.campaign.id}
          onClose={() => setPendingTransition(null)}
          onConfirm={(reason) =>
            doStatusChange(pendingTransition.campaign.id, pendingTransition.targetStatus, reason)
          }
        />
      )}
    </div>
  );
}
