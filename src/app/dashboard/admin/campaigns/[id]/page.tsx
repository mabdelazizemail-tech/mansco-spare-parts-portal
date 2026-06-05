"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Edit,
  Play,
  Pause,
  CheckCircle2,
  Archive,
  Copy,
  Tag,
  Users,
  ShoppingCart,
  TrendingUp,
  Calendar,
  Clock,
  Percent,
  Hash,
  DollarSign,
  BarChart3,
  Package,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  X,
  Search,
  Pencil,
  ArrowUpDown,
  Wand2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CampaignItem = {
  id: string;
  part_number: string;
  part_description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_quantity: number;
  total_inquiries: number;
  total_orders: number;
  total_qty_sold: number;
  total_discount_given: number;
  total_backorders: number;
};

type AuditEntry = {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  campaign_type: string;
  status: string;
  start_date: string;
  end_date: string;
  target_audience: string;
  target_dealer_group: string | null;
  eligibility_rules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  items: CampaignItem[];
  audit_log: AuditEntry[];
};

type PerformanceData = {
  summary: {
    total_items: number;
    total_orders: number;
    total_quantity: number;
    total_discount: number;
    unique_dealers: number;
    first_time_buyers: number;
    repeat_buyers: number;
  };
  items: CampaignItem[];
  dealer_participation: { dealer_id: string; orders: number; total_discount: number; total_qty: number }[];
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const auditActionLabels: Record<string, string> = {
  created: "Campaign Created",
  activated: "Activated",
  paused: "Paused",
  resumed: "Resumed",
  completed: "Marked Completed",
  archived: "Archived",
  edited: "Edited",
  item_added: "Items Added",
  item_edited: "Item Edited",
  item_removed: "Item Removed",
  items_bulk_adjusted: "Bulk Discount Adjustment",
  extended: "End Date Extended",
};

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "items" | "performance" | "audit">("overview");

  // Item management state
  const [itemSearch, setItemSearch] = useState("");
  const [itemSort, setItemSort] = useState<"part" | "discount" | "orders" | "qty">("part");
  const [itemFilterType, setItemFilterType] = useState<"all" | "percentage" | "fixed">("all");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<Partial<CampaignItem>>({});
  const [itemSaving, setItemSaving] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    part_number: "",
    part_description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 0,
    min_order_quantity: 1,
  });
  const [bulkAdjustOpen, setBulkAdjustOpen] = useState(false);
  const [bulkAdjustValue, setBulkAdjustValue] = useState<string>("");
  const [bulkAdjustMode, setBulkAdjustMode] = useState<"set_percentage" | "set_fixed" | "increase_pct" | "decrease_pct">("set_percentage");
  const [itemError, setItemError] = useState("");

  const isEditable = campaign?.status === "draft" || campaign?.status === "paused";

  // Item CRUD
  const startEditItem = (item: CampaignItem) => {
    setEditingItemId(item.id);
    setItemDraft({
      part_number: item.part_number,
      part_description: item.part_description,
      discount_type: item.discount_type,
      discount_value: item.discount_value,
      min_order_quantity: item.min_order_quantity,
    });
    setItemError("");
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setItemDraft({});
    setItemError("");
  };

  const saveEditItem = async (itemId: string) => {
    if (!itemDraft.part_number || String(itemDraft.part_number).trim() === "") {
      setItemError("Part number is required");
      return;
    }
    if (!itemDraft.discount_value || Number(itemDraft.discount_value) <= 0) {
      setItemError("Discount value must be greater than zero");
      return;
    }
    if (itemDraft.discount_type === "percentage" && Number(itemDraft.discount_value) > 100) {
      setItemError("Percentage cannot exceed 100%");
      return;
    }
    setItemSaving(true);
    setItemError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part_number: String(itemDraft.part_number).trim(),
          part_description: itemDraft.part_description || null,
          discount_type: itemDraft.discount_type,
          discount_value: Number(itemDraft.discount_value),
          min_order_quantity: Number(itemDraft.min_order_quantity) || 1,
        }),
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error?.message || "Failed to update item");
      }
      setEditingItemId(null);
      setItemDraft({});
      await fetchData();
    } catch (e: unknown) {
      setItemError(e instanceof Error ? e.message : "Failed to update item");
    } finally {
      setItemSaving(false);
    }
  };

  const deleteItem = async (itemId: string, partNumber: string) => {
    if (!confirm(`Remove "${partNumber}" from this campaign? This cannot be undone.`)) return;
    setItemSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json();
        alert(b.error?.message || "Failed to delete item");
        return;
      }
      await fetchData();
    } finally {
      setItemSaving(false);
    }
  };

  const addNewItem = async () => {
    if (!newItem.part_number.trim()) {
      setItemError("Part number is required");
      return;
    }
    if (!newItem.discount_value || newItem.discount_value <= 0) {
      setItemError("Discount value must be greater than zero");
      return;
    }
    if (newItem.discount_type === "percentage" && newItem.discount_value > 100) {
      setItemError("Percentage cannot exceed 100%");
      return;
    }
    setItemSaving(true);
    setItemError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part_number: newItem.part_number.trim(),
          part_description: newItem.part_description.trim() || null,
          discount_type: newItem.discount_type,
          discount_value: Number(newItem.discount_value),
          min_order_quantity: Number(newItem.min_order_quantity) || 1,
        }),
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error?.message || "Failed to add item");
      }
      setShowAddItem(false);
      setNewItem({
        part_number: "",
        part_description: "",
        discount_type: "percentage",
        discount_value: 0,
        min_order_quantity: 1,
      });
      await fetchData();
    } catch (e: unknown) {
      setItemError(e instanceof Error ? e.message : "Failed to add item");
    } finally {
      setItemSaving(false);
    }
  };

  const applyBulkAdjust = async () => {
    const v = Number(bulkAdjustValue);
    if (!v || v <= 0) {
      setItemError("Enter a valid value");
      return;
    }
    if (!campaign) return;
    if (!confirm(`Apply bulk adjustment to ${campaign.items.length} items?`)) return;

    setItemSaving(true);
    setItemError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/items/bulk-adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: bulkAdjustMode, value: v }),
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error?.message || "Bulk adjustment failed");
      }
      setBulkAdjustOpen(false);
      setBulkAdjustValue("");
      await fetchData();
    } catch (e: unknown) {
      setItemError(e instanceof Error ? e.message : "Bulk adjustment failed");
    } finally {
      setItemSaving(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, perfRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`),
        fetch(`/api/campaigns/${campaignId}/performance`),
      ]);

      if (campRes.ok) {
        const campBody = await campRes.json();
        setCampaign(campBody.data);
      }
      if (perfRes.ok) {
        const perfBody = await perfRes.json();
        setPerf(perfBody.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const doStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const b = await res.json();
        alert(b.error?.message || "Failed");
        return;
      }
      await fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  const doDuplicate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/duplicate`, { method: "POST" });
      if (res.ok) {
        const body = await res.json();
        router.push(`/dashboard/admin/campaigns/${body.data.id}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-white/20" />
        <p className="mt-4 text-white/40">Campaign not found.</p>
        <button onClick={() => router.push("/dashboard/admin/campaigns")} className="mt-4 text-sm text-[#00BFA6] hover:underline">
          Back to campaigns
        </button>
      </div>
    );
  }

  const daysTotal = Math.max(1, Math.ceil((new Date(campaign.end_date).getTime() - new Date(campaign.start_date).getTime()) / 86400000));
  const daysElapsed = Math.max(0, Math.ceil((Date.now() - new Date(campaign.start_date).getTime()) / 86400000));
  const progressPct = Math.min(100, Math.round((daysElapsed / daysTotal) * 100));
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  const summary = perf?.summary ?? { total_items: 0, total_orders: 0, total_quantity: 0, total_discount: 0, unique_dealers: 0, first_time_buyers: 0, repeat_buyers: 0 };

  const TABS = ["overview", "items", "performance", "audit"] as const;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard/admin/campaigns")} className="rounded-lg p-2 text-white/40 transition hover:bg-[#1A1A1A] hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">{campaign.name}</h1>
              <Badge variant="outline" className={`${statusStyles[campaign.status]} text-[10px] uppercase font-semibold`}>
                {campaign.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-white/40">{campaign.description || "No description"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actionLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          ) : (
            <>
              {["draft", "active", "paused"].includes(campaign.status) && (
                <Button size="sm" variant="ghost" className="text-white/40 hover:text-white" onClick={() => router.push(`/dashboard/admin/campaigns/${campaignId}/edit`)}>
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              )}
              {campaign.status === "draft" && (
                <Button size="sm" variant="ghost" className="text-emerald-400/80 hover:text-emerald-400" onClick={() => doStatusChange("active")}>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Activate
                </Button>
              )}
              {campaign.status === "active" && (
                <Button size="sm" variant="ghost" className="text-amber-400/80 hover:text-amber-400" onClick={() => doStatusChange("paused")}>
                  <Pause className="mr-1.5 h-3.5 w-3.5" /> Pause
                </Button>
              )}
              {campaign.status === "paused" && (
                <Button size="sm" variant="ghost" className="text-emerald-400/80 hover:text-emerald-400" onClick={() => doStatusChange("active")}>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Resume
                </Button>
              )}
              {["active", "paused"].includes(campaign.status) && (
                <Button size="sm" variant="ghost" className="text-blue-400/80 hover:text-blue-400" onClick={() => doStatusChange("completed")}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Complete
                </Button>
              )}
              {campaign.status === "completed" && (
                <Button size="sm" variant="ghost" className="text-white/40 hover:text-white" onClick={() => doStatusChange("archived")}>
                  <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-white/40 hover:text-white" onClick={doDuplicate}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Duplicate
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Campaign meta row */}
      <div className="flex flex-wrap gap-4 text-xs text-white/50">
        <span className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          {typeLabels[campaign.campaign_type] ?? campaign.campaign_type}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(campaign.start_date)} – {formatDate(campaign.end_date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {campaign.target_audience === "all" ? "All Dealers" : campaign.target_dealer_group || campaign.target_audience}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Ended"}
        </span>
      </div>

      {/* Progress bar */}
      {["active", "paused"].includes(campaign.status) && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-white/30">
            <span>{formatDate(campaign.start_date)}</span>
            <span>{progressPct}% elapsed</span>
            <span>{formatDate(campaign.end_date)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
            <div
              className="h-full rounded-full bg-[#00BFA6] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-lg bg-violet-500/10 p-2.5"><Package className="h-4 w-4 text-violet-400" /></div>
            <div>
              <p className="text-xl font-bold text-white">{summary.total_items}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Campaign Items</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-lg bg-emerald-500/10 p-2.5"><ShoppingCart className="h-4 w-4 text-emerald-400" /></div>
            <div>
              <p className="text-xl font-bold text-white">{summary.total_orders}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Orders Placed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-lg bg-[#00BFA6]/10 p-2.5"><Users className="h-4 w-4 text-[#00BFA6]" /></div>
            <div>
              <p className="text-xl font-bold text-white">{summary.unique_dealers}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Dealers Participated</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-lg bg-amber-500/10 p-2.5"><DollarSign className="h-4 w-4 text-amber-400" /></div>
            <div>
              <p className="text-xl font-bold text-white">{formatCurrency(summary.total_discount)}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Total Discount</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2A2A2A] pb-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-t-lg px-4 py-2.5 text-xs font-semibold capitalize transition ${
              activeTab === tab
                ? "border-b-2 border-[#00BFA6] text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {campaign.cover_image_url && (
            <div className="relative h-48 w-full overflow-hidden rounded-xl border border-[#2A2A2A] lg:col-span-2">
              <Image
                src={campaign.cover_image_url}
                alt={campaign.name}
                fill
                sizes="(max-width: 1024px) 100vw, 960px"
                className="object-cover"
              />
            </div>
          )}
          {/* Eligibility rules */}
          <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
            <CardHeader><CardTitle className="text-sm text-white">Eligibility Rules</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(campaign.eligibility_rules).length === 0 ? (
                <p className="text-sm text-white/30">No eligibility restrictions — all eligible dealers qualify.</p>
              ) : (
                <div className="space-y-2">
                  {Boolean(campaign.eligibility_rules.min_credit_limit) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Min Credit Limit</span>
                      <span className="text-white">{formatCurrency(Number(campaign.eligibility_rules.min_credit_limit))}</span>
                    </div>
                  )}
                  {Boolean(campaign.eligibility_rules.min_target_pct) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Min Target Achievement</span>
                      <span className="text-white">{String(campaign.eligibility_rules.min_target_pct)}%</span>
                    </div>
                  )}
                  {Array.isArray(campaign.eligibility_rules.financial_status) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Financial Status</span>
                      <span className="text-white capitalize">{(campaign.eligibility_rules.financial_status as string[]).join(", ")}</span>
                    </div>
                  )}
                  {Array.isArray(campaign.eligibility_rules.order_types) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Order Types</span>
                      <span className="text-white capitalize">{(campaign.eligibility_rules.order_types as string[]).join(", ")}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick item list */}
          <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
            <CardHeader><CardTitle className="text-sm text-white">Items ({campaign.items.length})</CardTitle></CardHeader>
            <CardContent>
              {campaign.items.length === 0 ? (
                <p className="text-sm text-white/30">No items added yet.</p>
              ) : (
                <div className="space-y-2">
                  {campaign.items.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-[#0D0D0D] px-3 py-2">
                      <div>
                        <span className="font-mono text-sm text-white">{item.part_number}</span>
                        {item.part_description && <span className="ml-2 text-xs text-white/40">{item.part_description}</span>}
                      </div>
                      <Badge variant="outline" className="border-[#2A2A2A] text-xs text-white/60">
                        {item.discount_type === "percentage" ? `${item.discount_value}%` : formatCurrency(item.discount_value)} off
                      </Badge>
                    </div>
                  ))}
                  {campaign.items.length > 8 && (
                    <p className="text-center text-xs text-white/30">
                      +{campaign.items.length - 8} more items
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "items" && (() => {
        const filteredItems = campaign.items
          .filter((item) => {
            const matchesSearch =
              !itemSearch ||
              item.part_number.toLowerCase().includes(itemSearch.toLowerCase()) ||
              (item.part_description ?? "").toLowerCase().includes(itemSearch.toLowerCase());
            const matchesType = itemFilterType === "all" || item.discount_type === itemFilterType;
            return matchesSearch && matchesType;
          })
          .sort((a, b) => {
            if (itemSort === "part") return a.part_number.localeCompare(b.part_number);
            if (itemSort === "discount") return b.discount_value - a.discount_value;
            if (itemSort === "orders") return b.total_orders - a.total_orders;
            if (itemSort === "qty") return b.total_qty_sold - a.total_qty_sold;
            return 0;
          });

        // Item aggregates
        const percentageItems = campaign.items.filter((i) => i.discount_type === "percentage");
        const fixedItems = campaign.items.filter((i) => i.discount_type === "fixed");
        const avgPercentage =
          percentageItems.length > 0
            ? percentageItems.reduce((s, i) => s + i.discount_value, 0) / percentageItems.length
            : 0;
        const totalFixed = fixedItems.reduce((s, i) => s + i.discount_value, 0);
        const maxDiscountItem = campaign.items.reduce<CampaignItem | null>(
          (max, i) => {
            if (i.discount_type !== "percentage") return max;
            if (!max || i.discount_value > max.discount_value) return i;
            return max;
          },
          null
        );

        return (
          <div className="space-y-4">
            {/* Item summary cards */}
            <div className="grid gap-3 sm:grid-cols-4">
              <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-violet-400">
                    <Package className="h-3.5 w-3.5" />
                    <p className="text-[10px] uppercase tracking-wider font-semibold">Total Items</p>
                  </div>
                  <p className="mt-1.5 text-xl font-bold text-white">{campaign.items.length}</p>
                </CardContent>
              </Card>
              <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Percent className="h-3.5 w-3.5" />
                    <p className="text-[10px] uppercase tracking-wider font-semibold">% Discount Items</p>
                  </div>
                  <p className="mt-1.5 text-xl font-bold text-white">
                    {percentageItems.length}{" "}
                    <span className="text-xs font-normal text-white/40">avg {avgPercentage.toFixed(1)}%</span>
                  </p>
                </CardContent>
              </Card>
              <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-amber-400">
                    <DollarSign className="h-3.5 w-3.5" />
                    <p className="text-[10px] uppercase tracking-wider font-semibold">Fixed EGP Items</p>
                  </div>
                  <p className="mt-1.5 text-xl font-bold text-white">
                    {fixedItems.length}{" "}
                    <span className="text-xs font-normal text-white/40">{formatCurrency(totalFixed)} total</span>
                  </p>
                </CardContent>
              </Card>
              <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <p className="text-[10px] uppercase tracking-wider font-semibold">Top % Discount</p>
                  </div>
                  <p className="mt-1.5 text-xl font-bold text-white">
                    {maxDiscountItem ? `${maxDiscountItem.discount_value}%` : "—"}
                  </p>
                  {maxDiscountItem && (
                    <p className="text-[10px] font-mono text-white/40 truncate">{maxDiscountItem.part_number}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Toolbar */}
            <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <input
                        placeholder="Search part number or description..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] ps-9 pe-3 text-sm text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none"
                      />
                    </div>
                    <select
                      value={itemFilterType}
                      onChange={(e) => setItemFilterType(e.target.value as any)}
                      className="h-9 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-xs text-white focus:border-[#00BFA6] focus:outline-none"
                    >
                      <option value="all">All Discount Types</option>
                      <option value="percentage">Percentage Only</option>
                      <option value="fixed">Fixed EGP Only</option>
                    </select>
                    <select
                      value={itemSort}
                      onChange={(e) => setItemSort(e.target.value as any)}
                      className="h-9 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-xs text-white focus:border-[#00BFA6] focus:outline-none"
                    >
                      <option value="part">Sort: Part Number</option>
                      <option value="discount">Sort: Discount (desc)</option>
                      <option value="orders">Sort: Orders (desc)</option>
                      <option value="qty">Sort: Qty Sold (desc)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditable && campaign.items.length > 0 && (
                      <button
                        onClick={() => setBulkAdjustOpen(!bulkAdjustOpen)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:border-violet-500/40 hover:text-violet-400"
                      >
                        <Wand2 className="h-3 w-3" />
                        Bulk Adjust
                      </button>
                    )}
                    {isEditable && (
                      <button
                        onClick={() => {
                          setShowAddItem(true);
                          setItemError("");
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-[#00BFA6] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#00BFA6]/90"
                      >
                        <Plus className="h-3 w-3" />
                        Add Item
                      </button>
                    )}
                  </div>
                </div>

                {/* Status banner for non-editable */}
                {!isEditable && (
                  <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2.5 text-xs text-blue-400 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Items are read-only for {campaign.status} campaigns. Pause the campaign to make changes.
                  </div>
                )}

                {/* Bulk adjust panel */}
                {bulkAdjustOpen && isEditable && (
                  <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
                    <p className="text-xs font-semibold text-violet-400 flex items-center gap-2">
                      <Wand2 className="h-3.5 w-3.5" />
                      Bulk Discount Adjustment ({campaign.items.length} items)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={bulkAdjustMode}
                        onChange={(e) => setBulkAdjustMode(e.target.value as any)}
                        className="h-9 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-xs text-white focus:border-[#00BFA6] focus:outline-none"
                      >
                        <option value="set_percentage">Set all to X% discount</option>
                        <option value="set_fixed">Set all to X EGP fixed discount</option>
                        <option value="increase_pct">Increase % discount by X points</option>
                        <option value="decrease_pct">Decrease % discount by X points</option>
                      </select>
                      <input
                        type="number"
                        value={bulkAdjustValue}
                        onChange={(e) => setBulkAdjustValue(e.target.value)}
                        placeholder="Value"
                        min={0}
                        className="h-9 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white focus:border-[#00BFA6] focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setBulkAdjustOpen(false)}
                        className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-1.5 text-xs text-white/60 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={applyBulkAdjust}
                        disabled={itemSaving}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
                      >
                        {itemSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                        Apply
                      </button>
                    </div>
                  </div>
                )}

                {/* Add Item Inline Form */}
                {showAddItem && isEditable && (
                  <div className="mt-3 rounded-lg border border-[#00BFA6]/30 bg-[#00BFA6]/5 p-4 space-y-3">
                    <p className="text-xs font-semibold text-[#00BFA6] flex items-center gap-2">
                      <Plus className="h-3.5 w-3.5" />
                      Add New Campaign Item
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={newItem.part_number}
                        onChange={(e) => setNewItem({ ...newItem, part_number: e.target.value })}
                        placeholder="Part Number *"
                        className="h-9 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none"
                      />
                      <input
                        value={newItem.part_description}
                        onChange={(e) => setNewItem({ ...newItem, part_description: e.target.value })}
                        placeholder="Description (optional)"
                        className="h-9 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <select
                        value={newItem.discount_type}
                        onChange={(e) =>
                          setNewItem({ ...newItem, discount_type: e.target.value as any })
                        }
                        className="h-9 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white focus:border-[#00BFA6] focus:outline-none"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (EGP)</option>
                      </select>
                      <input
                        type="number"
                        value={newItem.discount_value || ""}
                        onChange={(e) =>
                          setNewItem({ ...newItem, discount_value: Number(e.target.value) })
                        }
                        placeholder={newItem.discount_type === "percentage" ? "%" : "EGP"}
                        min={0}
                        max={newItem.discount_type === "percentage" ? 100 : undefined}
                        className="h-9 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white focus:border-[#00BFA6] focus:outline-none"
                      />
                      <input
                        type="number"
                        value={newItem.min_order_quantity}
                        onChange={(e) =>
                          setNewItem({ ...newItem, min_order_quantity: Number(e.target.value) })
                        }
                        placeholder="Min Qty"
                        min={1}
                        className="h-9 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white focus:border-[#00BFA6] focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowAddItem(false);
                          setItemError("");
                        }}
                        className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-1.5 text-xs text-white/60 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addNewItem}
                        disabled={itemSaving}
                        className="flex items-center gap-1.5 rounded-lg bg-[#00BFA6] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#00BFA6]/90 disabled:opacity-50"
                      >
                        {itemSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Add Item
                      </button>
                    </div>
                  </div>
                )}

                {itemError && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
                    {itemError}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
              <CardContent className="pt-6">
                {campaign.items.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="mx-auto h-10 w-10 text-white/20" />
                    <p className="mt-3 text-sm text-white/40">No items in this campaign yet</p>
                    {isEditable && (
                      <button
                        onClick={() => setShowAddItem(true)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#00BFA6] px-4 py-2 text-xs font-semibold text-black hover:bg-[#00BFA6]/90"
                      >
                        <Plus className="h-3 w-3" />
                        Add First Item
                      </button>
                    )}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <p className="py-12 text-center text-sm text-white/30">No items match your filters.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#2A2A2A]">
                        <TableHead className="text-white/40">Part Number</TableHead>
                        <TableHead className="text-white/40">Description</TableHead>
                        <TableHead className="text-white/40">Discount</TableHead>
                        <TableHead className="text-center text-white/40">Min Qty</TableHead>
                        <TableHead className="text-center text-white/40">Orders</TableHead>
                        <TableHead className="text-center text-white/40">Qty Sold</TableHead>
                        <TableHead className="text-end text-white/40">Discount Given</TableHead>
                        {isEditable && <TableHead className="text-end text-white/40">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const isEditing = editingItemId === item.id;
                        return (
                          <TableRow key={item.id} className="border-[#2A2A2A] hover:bg-white/[0.02]">
                            {isEditing ? (
                              <>
                                <TableCell>
                                  <input
                                    className="h-8 w-full rounded border border-[#00BFA6]/40 bg-[#0D0D0D] px-2 text-sm font-mono text-white focus:border-[#00BFA6] focus:outline-none"
                                    value={String(itemDraft.part_number ?? "")}
                                    onChange={(e) => setItemDraft({ ...itemDraft, part_number: e.target.value })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <input
                                    className="h-8 w-full rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-sm text-white focus:border-[#00BFA6] focus:outline-none"
                                    value={String(itemDraft.part_description ?? "")}
                                    onChange={(e) => setItemDraft({ ...itemDraft, part_description: e.target.value })}
                                    placeholder="Description"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      value={String(itemDraft.discount_type ?? "percentage")}
                                      onChange={(e) => setItemDraft({ ...itemDraft, discount_type: e.target.value })}
                                      className="h-8 rounded border border-[#2A2A2A] bg-[#0D0D0D] px-1.5 text-xs text-white focus:border-[#00BFA6] focus:outline-none"
                                    >
                                      <option value="percentage">%</option>
                                      <option value="fixed">EGP</option>
                                    </select>
                                    <input
                                      type="number"
                                      className="h-8 w-20 rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-sm text-white focus:border-[#00BFA6] focus:outline-none"
                                      value={Number(itemDraft.discount_value ?? 0)}
                                      onChange={(e) => setItemDraft({ ...itemDraft, discount_value: Number(e.target.value) })}
                                      min={0}
                                      max={itemDraft.discount_type === "percentage" ? 100 : undefined}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <input
                                    type="number"
                                    className="h-8 w-16 rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-sm text-white text-center focus:border-[#00BFA6] focus:outline-none"
                                    value={Number(itemDraft.min_order_quantity ?? 1)}
                                    onChange={(e) => setItemDraft({ ...itemDraft, min_order_quantity: Number(e.target.value) })}
                                    min={1}
                                  />
                                </TableCell>
                                <TableCell className="text-center text-sm text-white/40">—</TableCell>
                                <TableCell className="text-center text-sm text-white/40">—</TableCell>
                                <TableCell className="text-center text-sm text-white/40">—</TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => saveEditItem(item.id)}
                                      disabled={itemSaving}
                                      className="rounded p-1.5 text-emerald-400/80 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-50"
                                      title="Save"
                                    >
                                      {itemSaving ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Save className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <button
                                      onClick={cancelEditItem}
                                      className="rounded p-1.5 text-white/40 hover:bg-white/5 hover:text-white"
                                      title="Cancel"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="font-mono text-sm text-white">{item.part_number}</TableCell>
                                <TableCell className="text-sm text-white/60 max-w-xs truncate">
                                  {item.part_description || "—"}
                                </TableCell>
                                <TableCell>
                                  {item.discount_type === "percentage" ? (
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold"
                                    >
                                      <Percent className="mr-0.5 h-2.5 w-2.5" />
                                      {item.discount_value}%
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold"
                                    >
                                      <DollarSign className="mr-0.5 h-2.5 w-2.5" />
                                      {formatCurrency(item.discount_value)}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="border-[#2A2A2A] text-xs text-white/60">
                                    {item.min_order_quantity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center text-sm text-white">{item.total_orders}</TableCell>
                                <TableCell className="text-center text-sm text-white">{item.total_qty_sold}</TableCell>
                                <TableCell className="text-end font-mono text-sm text-amber-400">
                                  {formatCurrency(item.total_discount_given)}
                                </TableCell>
                                {isEditable && (
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => startEditItem(item)}
                                        className="rounded p-1.5 text-white/40 transition hover:bg-blue-500/10 hover:text-blue-400"
                                        title="Edit item"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteItem(item.id, item.part_number)}
                                        className="rounded p-1.5 text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
                                        title="Remove from campaign"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </TableCell>
                                )}
                              </>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {activeTab === "performance" && (
        <div className="space-y-6">
          {/* Summary row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
              <CardContent className="p-5">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Total Qty Sold</p>
                <p className="mt-1 text-2xl font-bold text-white">{summary.total_quantity}</p>
              </CardContent>
            </Card>
            <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
              <CardContent className="p-5">
                <p className="text-[10px] uppercase tracking-wider text-white/40">First-Time Buyers</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">{summary.first_time_buyers}</p>
              </CardContent>
            </Card>
            <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
              <CardContent className="p-5">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Repeat Buyers</p>
                <p className="mt-1 text-2xl font-bold text-blue-400">{summary.repeat_buyers}</p>
              </CardContent>
            </Card>
          </div>

          {/* Dealer participation */}
          <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
            <CardHeader><CardTitle className="text-sm text-white">Dealer Participation</CardTitle></CardHeader>
            <CardContent>
              {(!perf?.dealer_participation || perf.dealer_participation.length === 0) ? (
                <p className="py-8 text-center text-sm text-white/30">No dealer participation data yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2A2A2A]">
                      <TableHead className="text-white/40">Dealer ID</TableHead>
                      <TableHead className="text-center text-white/40">Orders</TableHead>
                      <TableHead className="text-center text-white/40">Qty Purchased</TableHead>
                      <TableHead className="text-end text-white/40">Discount Utilized</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perf.dealer_participation.map((dp) => (
                      <TableRow key={dp.dealer_id} className="border-[#2A2A2A]">
                        <TableCell className="font-mono text-xs text-white/60">{dp.dealer_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-center text-sm text-white">{dp.orders}</TableCell>
                        <TableCell className="text-center text-sm text-white">{dp.total_qty}</TableCell>
                        <TableCell className="text-end font-mono text-sm text-amber-400">{formatCurrency(dp.total_discount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "audit" && (
        <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
          <CardHeader><CardTitle className="text-sm text-white">Audit Trail</CardTitle></CardHeader>
          <CardContent>
            {campaign.audit_log.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/30">No audit entries.</p>
            ) : (
              <div className="space-y-3">
                {campaign.audit_log.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 rounded-lg bg-[#0D0D0D] px-4 py-3">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#00BFA6]" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {auditActionLabels[entry.action] || entry.action}
                      </p>
                      {Object.keys(entry.details).length > 0 && (
                        <p className="mt-0.5 text-xs text-white/40">
                          {JSON.stringify(entry.details)}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-white/30">{formatDateTime(entry.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
