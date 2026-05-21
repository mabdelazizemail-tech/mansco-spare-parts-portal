"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type CampaignItemData = {
  id?: string;
  key: string;
  part_number: string;
  part_description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_quantity: number;
  _isNew?: boolean;
  _deleted?: boolean;
};

const fieldClass =
  "h-9 w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none focus:ring-1 focus:ring-[#00BFA6]/30";
const labelClass = "text-xs font-medium text-white/50";

let keyCounter = 0;
function newKey() {
  return `eitem-${++keyCounter}`;
}

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Campaign fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [campaignType, setCampaignType] = useState("discount");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [targetDealerGroup, setTargetDealerGroup] = useState("");
  const [campaignStatus, setCampaignStatus] = useState("");

  // Eligibility
  const [minCreditLimit, setMinCreditLimit] = useState("");
  const [minTargetPct, setMinTargetPct] = useState("");
  const [financialStatus, setFinancialStatus] = useState<string[]>([]);
  const [orderTypes, setOrderTypes] = useState<string[]>([]);

  // Items
  const [items, setItems] = useState<CampaignItemData[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`);
        if (!res.ok) throw new Error("Not found");
        const body = await res.json();
        const c = body.data;

        setName(c.name || "");
        setDescription(c.description || "");
        setCampaignType(c.campaign_type || "discount");
        setStartDate(c.start_date || "");
        setEndDate(c.end_date || "");
        setTargetAudience(c.target_audience || "all");
        setTargetDealerGroup(c.target_dealer_group || "");
        setCampaignStatus(c.status || "");

        const rules = c.eligibility_rules || {};
        setMinCreditLimit(rules.min_credit_limit?.toString() || "");
        setMinTargetPct(rules.min_target_pct?.toString() || "");
        setFinancialStatus(rules.financial_status || []);
        setOrderTypes(rules.order_types || []);

        setItems(
          (c.items || []).map((item: Record<string, unknown>) => ({
            id: item.id as string,
            key: newKey(),
            part_number: (item.part_number as string) || "",
            part_description: (item.part_description as string) || "",
            discount_type: (item.discount_type as "percentage" | "fixed") || "percentage",
            discount_value: (item.discount_value as number) || 0,
            min_order_quantity: (item.min_order_quantity as number) || 1,
          }))
        );
      } catch {
        setError("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignId]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { key: newKey(), part_number: "", part_description: "", discount_type: "percentage", discount_value: 0, min_order_quantity: 1, _isNew: true },
    ]);
  };

  const removeItem = (key: string) => {
    const item = items.find((i) => i.key === key);
    if (item?.id) {
      setDeletedItemIds((prev) => [...prev, item.id!]);
    }
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const updateItem = (key: string, field: string, value: unknown) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  };

  const toggleFinStatus = (val: string) => {
    setFinancialStatus((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };
  const toggleOrderType = (val: string) => {
    setOrderTypes((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (!startDate || !endDate) { setError("Dates are required"); return; }

    setSaving(true);
    setError("");
    try {
      const eligibility_rules: Record<string, unknown> = {};
      if (minCreditLimit) eligibility_rules.min_credit_limit = Number(minCreditLimit);
      if (minTargetPct) eligibility_rules.min_target_pct = Number(minTargetPct);
      if (financialStatus.length > 0) eligibility_rules.financial_status = financialStatus;
      if (orderTypes.length > 0) eligibility_rules.order_types = orderTypes;

      // 1. Update campaign
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          campaign_type: campaignType,
          start_date: startDate,
          end_date: endDate,
          target_audience: targetAudience,
          target_dealer_group: targetDealerGroup || null,
          eligibility_rules,
        }),
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error?.message || "Failed to update");
      }

      // 2. Delete removed items
      for (const itemId of deletedItemIds) {
        await fetch(`/api/campaigns/${campaignId}/items?item_id=${itemId}`, { method: "DELETE" });
      }

      // 3. Add new items
      const newItems = items
        .filter((i) => i._isNew && i.part_number.trim())
        .map((i) => ({
          part_number: i.part_number.trim(),
          part_description: i.part_description.trim() || null,
          discount_type: i.discount_type,
          discount_value: Number(i.discount_value),
          min_order_quantity: Number(i.min_order_quantity) || 1,
        }));

      if (newItems.length > 0) {
        await fetch(`/api/campaigns/${campaignId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItems),
        });
      }

      router.push(`/dashboard/admin/campaigns/${campaignId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push(`/dashboard/admin/campaigns/${campaignId}`)} className="rounded-lg p-2 text-white/40 transition hover:bg-[#1A1A1A] hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">Edit Campaign</h1>
          <p className="mt-0.5 text-sm text-white/40">{name || "Untitled"}</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#00BFA6]/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Basic Info */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader><CardTitle className="text-sm text-white">Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className={labelClass}>Campaign Name *</Label>
            <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className={labelClass}>Description</Label>
            <textarea className={`${fieldClass} h-20 resize-none py-2`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className={labelClass}>Campaign Type</Label>
              <select className={fieldClass} value={campaignType} onChange={(e) => setCampaignType(e.target.value)}>
                <option value="discount">Discount</option>
                <option value="bundled_offer">Bundled Offer</option>
                <option value="seasonal_promotion">Seasonal Promotion</option>
                <option value="target_incentive">Target Incentive</option>
              </select>
            </div>
            <div>
              <Label className={labelClass}>Start Date *</Label>
              <input type="date" className={fieldClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className={labelClass}>End Date *</Label>
              <input type="date" className={fieldClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Audience */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader><CardTitle className="text-sm text-white">Target Audience</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>Audience</Label>
              <select className={fieldClass} value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}>
                <option value="all">All Dealers</option>
                <option value="group">Dealer Group</option>
                <option value="individual">Individual Dealers</option>
              </select>
            </div>
            {targetAudience === "group" && (
              <div>
                <Label className={labelClass}>Group Name</Label>
                <input className={fieldClass} value={targetDealerGroup} onChange={(e) => setTargetDealerGroup(e.target.value)} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Eligibility */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader><CardTitle className="text-sm text-white">Eligibility Rules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>Min Credit Limit (EGP)</Label>
              <input type="number" className={fieldClass} value={minCreditLimit} onChange={(e) => setMinCreditLimit(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label className={labelClass}>Min Target Achievement (%)</Label>
              <input type="number" className={fieldClass} value={minTargetPct} onChange={(e) => setMinTargetPct(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div>
            <Label className={labelClass}>Required Financial Status</Label>
            <div className="mt-2 flex gap-3">
              {["active", "warning"].map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={financialStatus.includes(s)} onChange={() => toggleFinStatus(s)} className="h-4 w-4 rounded border-[#2A2A2A] bg-[#0D0D0D] accent-[#00BFA6]" />
                  <span className="text-sm capitalize text-white/60">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className={labelClass}>Allowed Order Types</Label>
            <div className="mt-2 flex gap-3">
              {["daily", "air_dhl", "stock"].map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={orderTypes.includes(t)} onChange={() => toggleOrderType(t)} className="h-4 w-4 rounded border-[#2A2A2A] bg-[#0D0D0D] accent-[#00BFA6]" />
                  <span className="text-sm text-white/60">{t === "air_dhl" ? "Air/DHL" : t.charAt(0).toUpperCase() + t.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm text-white">Campaign Items</CardTitle>
          <button onClick={addItem}
            className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white">
            <Plus className="h-3 w-3" /> Add Item
          </button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-white/30">No items. Click &quot;Add Item&quot; to add parts.</p>
          )}
          {items.map((item, idx) => (
            <div key={item.key} className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-white/30" />
                  <span className="text-xs font-semibold text-white/40">
                    Item {idx + 1} {item._isNew && <span className="text-[#00BFA6]">(new)</span>}
                  </span>
                </div>
                <button onClick={() => removeItem(item.key)} className="rounded p-1 text-red-400/60 transition hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label className={labelClass}>Part Number *</Label>
                  <input className={fieldClass} value={item.part_number}
                    onChange={(e) => updateItem(item.key, "part_number", e.target.value)}
                    disabled={!item._isNew} // Can't change existing item part number
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className={labelClass}>Description</Label>
                  <input className={fieldClass} value={item.part_description}
                    onChange={(e) => updateItem(item.key, "part_description", e.target.value)} />
                </div>
                <div>
                  <Label className={labelClass}>Discount Type</Label>
                  <select className={fieldClass} value={item.discount_type}
                    onChange={(e) => updateItem(item.key, "discount_type", e.target.value)}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (EGP)</option>
                  </select>
                </div>
                <div>
                  <Label className={labelClass}>Value</Label>
                  <input type="number" className={fieldClass} value={item.discount_value}
                    onChange={(e) => updateItem(item.key, "discount_value", e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex justify-end gap-3 pb-8">
        <button onClick={() => router.push(`/dashboard/admin/campaigns/${campaignId}`)}
          className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white/60 transition hover:text-white">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#00BFA6]/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
