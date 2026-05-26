"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Tag,
  Info,
  Calendar,
  Users,
  Shield,
  Megaphone,
  CheckCircle2,
  Circle,
  FileEdit,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ItemsCSVUpload, { type CampaignItemDraft as CSVCampaignItemDraft } from "@/components/campaign-wizard/items-csv-upload";

type CampaignItemDraft = {
  key: string;
  part_number: string;
  part_description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_quantity: number;
};

const fieldClass =
  "h-10 w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none focus:ring-1 focus:ring-[#00BFA6]/30";
const labelClass = "text-xs font-semibold uppercase tracking-wider text-white/50";

let keyCounter = 0;
function newKey() {
  return `item-${++keyCounter}`;
}

type StepId = "basics" | "schedule" | "audience" | "eligibility" | "items" | "review";

const STEPS: { id: StepId; label: string; icon: React.ElementType; description: string }[] = [
  { id: "basics", label: "Basics", icon: FileEdit, description: "Name, description, and campaign type" },
  { id: "schedule", label: "Schedule", icon: Calendar, description: "Start and end dates" },
  { id: "audience", label: "Audience", icon: Users, description: "Who can see this campaign" },
  { id: "eligibility", label: "Eligibility", icon: Shield, description: "Conditions dealers must meet" },
  { id: "items", label: "Items", icon: Tag, description: "Parts and discount values" },
  { id: "review", label: "Review", icon: CheckCircle2, description: "Confirm and create" },
];

const CAMPAIGN_TYPES = [
  { value: "discount", label: "Discount", desc: "Percentage or fixed price reduction on selected parts", icon: "💸" },
  { value: "bundled_offer", label: "Bundled Offer", desc: "Buy multiple parts together for a special price", icon: "📦" },
  { value: "seasonal_promotion", label: "Seasonal Promotion", desc: "Time-limited offer tied to a season or event", icon: "🎉" },
  { value: "target_incentive", label: "Target Incentive", desc: "Reward dealers who hit specific sales targets", icon: "🎯" },
];

export default function NewCampaignWizard() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [campaignType, setCampaignType] = useState("discount");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [targetDealerGroup, setTargetDealerGroup] = useState("");
  const [minCreditLimit, setMinCreditLimit] = useState("");
  const [minTargetPct, setMinTargetPct] = useState("");
  const [financialStatus, setFinancialStatus] = useState<string[]>(["active"]);
  const [orderTypes, setOrderTypes] = useState<string[]>([]);
  const [items, setItems] = useState<CampaignItemDraft[]>([
    { key: newKey(), part_number: "", part_description: "", discount_type: "percentage", discount_value: 0, min_order_quantity: 1 },
  ]);

  // ── Step validation ───────────────────────────────────────────────
  const stepErrors = useMemo(() => {
    const errs: Record<StepId, string[]> = {
      basics: [],
      schedule: [],
      audience: [],
      eligibility: [],
      items: [],
      review: [],
    };

    if (!name.trim()) errs.basics.push("Campaign name is required");
    if (name.trim().length > 0 && name.trim().length < 3) errs.basics.push("Name must be at least 3 characters");
    if (!campaignType) errs.basics.push("Campaign type is required");

    if (!startDate) errs.schedule.push("Start date is required");
    if (!endDate) errs.schedule.push("End date is required");
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errs.schedule.push("End date must be after start date");
    }

    if (targetAudience === "group" && !targetDealerGroup.trim()) {
      errs.audience.push("Group name is required when targeting a dealer group");
    }

    if (financialStatus.length === 0) {
      errs.eligibility.push("Select at least one allowed financial status");
    }
    if (minCreditLimit && Number(minCreditLimit) < 0) {
      errs.eligibility.push("Minimum credit limit cannot be negative");
    }
    if (minTargetPct && (Number(minTargetPct) < 0 || Number(minTargetPct) > 100)) {
      errs.eligibility.push("Target % must be between 0 and 100");
    }

    const validItems = items.filter((i) => i.part_number.trim());
    if (validItems.length === 0) errs.items.push("Add at least one campaign item with a part number");
    validItems.forEach((it, idx) => {
      if (!it.discount_value || Number(it.discount_value) <= 0) {
        errs.items.push(`Item ${idx + 1}: discount value must be greater than zero`);
      }
      if (it.discount_type === "percentage" && Number(it.discount_value) > 100) {
        errs.items.push(`Item ${idx + 1}: percentage cannot exceed 100%`);
      }
    });

    return errs;
  }, [name, campaignType, startDate, endDate, targetAudience, targetDealerGroup, financialStatus, minCreditLimit, minTargetPct, items]);

  const currentStepErrors = stepErrors[currentStep.id];
  const stepIsValid = (id: StepId) => stepErrors[id].length === 0;
  const allValid = STEPS.slice(0, -1).every((s) => stepIsValid(s.id));


  const toggleFinStatus = (val: string) =>
    setFinancialStatus((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
  const toggleOrderType = (val: string) =>
    setOrderTypes((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));

  // ── Navigation ────────────────────────────────────────────────────
  const goNext = () => {
    if (!stepIsValid(currentStep.id)) return;
    setStepIndex((idx) => Math.min(idx + 1, STEPS.length - 1));
    setError("");
  };
  const goBack = () => {
    setStepIndex((idx) => Math.max(idx - 1, 0));
    setError("");
  };
  const goToStep = (idx: number) => {
    // Only allow going back, or forward if all previous steps valid
    if (idx <= stepIndex) {
      setStepIndex(idx);
    } else {
      const allPrevValid = STEPS.slice(0, idx).every((s) => stepIsValid(s.id));
      if (allPrevValid) setStepIndex(idx);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!allValid) {
      setError("Please fix validation errors in earlier steps before creating");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const eligibility_rules: Record<string, unknown> = {};
      if (minCreditLimit) eligibility_rules.min_credit_limit = Number(minCreditLimit);
      if (minTargetPct) eligibility_rules.min_target_pct = Number(minTargetPct);
      if (financialStatus.length > 0) eligibility_rules.financial_status = financialStatus;
      if (orderTypes.length > 0) eligibility_rules.order_types = orderTypes;

      const validItems = items.filter((i) => i.part_number.trim());
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        campaign_type: campaignType,
        start_date: startDate,
        end_date: endDate,
        target_audience: targetAudience,
        target_dealer_group: targetDealerGroup || null,
        eligibility_rules,
        items: validItems.map((i) => ({
          part_number: i.part_number.trim(),
          part_description: i.part_description.trim() || null,
          discount_type: i.discount_type,
          discount_value: Number(i.discount_value),
          min_order_quantity: Number(i.min_order_quantity) || 1,
        })),
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error?.message || "Failed to create campaign");
      }
      const body = await res.json();
      router.push(`/dashboard/admin/campaigns/${body.data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  };

  // ── Computed display helpers ──────────────────────────────────────
  const durationDays = useMemo(() => {
    if (!startDate || !endDate) return null;
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(Math.ceil(ms / (1000 * 60 * 60 * 24)), 0);
  }, [startDate, endDate]);

  const validItemsCount = items.filter((i) => i.part_number.trim()).length;
  const selectedTypeMeta = CAMPAIGN_TYPES.find((t) => t.value === campaignType);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/admin/campaigns")}
          className="rounded-lg p-2 text-white/40 transition hover:bg-[#1A1A1A] hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#00BFA6]" />
            New Campaign Wizard
          </h1>
          <p className="mt-0.5 text-sm text-white/40">
            Step {stepIndex + 1} of {STEPS.length} · {currentStep.description}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === stepIndex;
              const isComplete = idx < stepIndex && stepIsValid(step.id);
              const hasError = idx < stepIndex && !stepIsValid(step.id);
              const isClickable = idx <= stepIndex || STEPS.slice(0, idx).every((s) => stepIsValid(s.id));

              return (
                <div key={step.id} className="flex flex-1 items-center min-w-0">
                  <button
                    onClick={() => goToStep(idx)}
                    disabled={!isClickable}
                    className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg px-2 py-2 transition ${
                      isActive
                        ? "bg-[#00BFA6]/10"
                        : isClickable
                        ? "hover:bg-white/5"
                        : "opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                        isActive
                          ? "border-[#00BFA6] bg-[#00BFA6]/20 text-[#00BFA6]"
                          : isComplete
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                          : hasError
                          ? "border-red-500 bg-red-500/20 text-red-400"
                          : "border-[#2A2A2A] bg-[#0D0D0D] text-white/30"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : hasError ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isActive
                            ? "text-[#00BFA6]"
                            : isComplete
                            ? "text-emerald-400"
                            : hasError
                            ? "text-red-400"
                            : "text-white/40"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`h-0.5 w-4 flex-shrink-0 mx-1 ${isComplete ? "bg-emerald-500/40" : "bg-[#2A2A2A]"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Global error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step content */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <currentStep.icon className="h-4 w-4 text-[#00BFA6]" />
            {currentStep.label}
          </CardTitle>
          <p className="text-xs text-white/40">{currentStep.description}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* STEP: BASICS */}
          {currentStep.id === "basics" && (
            <>
              <div>
                <Label className={labelClass}>Campaign Name *</Label>
                <input
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Brake Pads Special"
                  maxLength={120}
                />
                <p className="mt-1 text-[10px] text-white/30">{name.length}/120 characters</p>
              </div>
              <div>
                <Label className={labelClass}>Description</Label>
                <textarea
                  className={`${fieldClass} h-24 resize-none py-2`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description shown to dealers..."
                  maxLength={500}
                />
                <p className="mt-1 text-[10px] text-white/30">{description.length}/500 characters</p>
              </div>
              <div>
                <Label className={labelClass}>Campaign Type *</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {CAMPAIGN_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setCampaignType(type.value)}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                        campaignType === type.value
                          ? "border-[#00BFA6] bg-[#00BFA6]/10"
                          : "border-[#2A2A2A] bg-[#0D0D0D] hover:border-[#3A3A3A]"
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-semibold ${
                            campaignType === type.value ? "text-[#00BFA6]" : "text-white"
                          }`}
                        >
                          {type.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/40 leading-tight">{type.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP: SCHEDULE */}
          {currentStep.id === "schedule" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={labelClass}>Start Date *</Label>
                  <input
                    type="date"
                    className={fieldClass}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className={labelClass}>End Date *</Label>
                  <input
                    type="date"
                    className={fieldClass}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                  />
                </div>
              </div>

              {/* Quick presets */}
              <div>
                <Label className={labelClass}>Quick Duration Presets</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { label: "1 Week", days: 7 },
                    { label: "2 Weeks", days: 14 },
                    { label: "1 Month", days: 30 },
                    { label: "3 Months", days: 90 },
                    { label: "Quarter", days: 91 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        const today = new Date();
                        const end = new Date();
                        end.setDate(today.getDate() + preset.days);
                        setStartDate(today.toISOString().split("T")[0]);
                        setEndDate(end.toISOString().split("T")[0]);
                      }}
                      className="rounded-md border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6]"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {durationDays !== null && (
                <div className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3">
                  <Info className="h-4 w-4 text-blue-400" />
                  <p className="text-xs text-white/60">
                    Campaign runs for{" "}
                    <span className="font-bold text-white">{durationDays} day{durationDays !== 1 ? "s" : ""}</span>
                  </p>
                </div>
              )}
            </>
          )}

          {/* STEP: AUDIENCE */}
          {currentStep.id === "audience" && (
            <>
              <div>
                <Label className={labelClass}>Target Audience *</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {[
                    { value: "all", label: "All Dealers", desc: "Visible to every active dealer" },
                    { value: "group", label: "Dealer Group", desc: "Limited to a specific region or group" },
                    { value: "individual", label: "Individual Dealers", desc: "Hand-picked dealer list" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTargetAudience(opt.value)}
                      className={`rounded-lg border p-4 text-left transition ${
                        targetAudience === opt.value
                          ? "border-[#00BFA6] bg-[#00BFA6]/10"
                          : "border-[#2A2A2A] bg-[#0D0D0D] hover:border-[#3A3A3A]"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          targetAudience === opt.value ? "text-[#00BFA6]" : "text-white"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="mt-1 text-[11px] text-white/40">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {targetAudience === "group" && (
                <div>
                  <Label className={labelClass}>Group Name *</Label>
                  <input
                    className={fieldClass}
                    value={targetDealerGroup}
                    onChange={(e) => setTargetDealerGroup(e.target.value)}
                    placeholder="e.g. Cairo Region, Premium Dealers"
                  />
                </div>
              )}

              {targetAudience === "individual" && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
                  Individual dealer selection will be available after creating the campaign — open the campaign detail page to assign specific dealers.
                </div>
              )}
            </>
          )}

          {/* STEP: ELIGIBILITY */}
          {currentStep.id === "eligibility" && (
            <>
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-400 flex gap-2">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>Eligibility rules determine which dealers in the audience can actually use the campaign. All conditions must pass.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={labelClass}>Min Credit Limit (EGP)</Label>
                  <input
                    type="number"
                    className={fieldClass}
                    value={minCreditLimit}
                    onChange={(e) => setMinCreditLimit(e.target.value)}
                    placeholder="Optional"
                    min={0}
                  />
                  <p className="mt-1 text-[10px] text-white/30">Dealers below this limit are excluded</p>
                </div>
                <div>
                  <Label className={labelClass}>Min Target Achievement (%)</Label>
                  <input
                    type="number"
                    className={fieldClass}
                    value={minTargetPct}
                    onChange={(e) => setMinTargetPct(e.target.value)}
                    placeholder="Optional"
                    min={0}
                    max={100}
                  />
                  <p className="mt-1 text-[10px] text-white/30">Hit % of monthly target to qualify</p>
                </div>
              </div>

              <div>
                <Label className={labelClass}>Allowed Financial Status *</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { val: "active", label: "✓ Active", color: "emerald" },
                    { val: "warning", label: "⚠ Warning", color: "yellow" },
                    { val: "blocked", label: "🚫 Blocked", color: "red" },
                  ].map((opt) => {
                    const selected = financialStatus.includes(opt.val);
                    return (
                      <button
                        key={opt.val}
                        onClick={() => toggleFinStatus(opt.val)}
                        className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                          selected
                            ? opt.color === "emerald"
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                              : opt.color === "yellow"
                              ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                              : "border-red-500 bg-red-500/20 text-red-400"
                            : "border-[#2A2A2A] bg-[#0D0D0D] text-white/40 hover:text-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className={labelClass}>Allowed Order Types (empty = all)</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { val: "daily", label: "Daily" },
                    { val: "air_dhl", label: "Air / DHL" },
                    { val: "stock", label: "Stock" },
                  ].map((opt) => {
                    const selected = orderTypes.includes(opt.val);
                    return (
                      <button
                        key={opt.val}
                        onClick={() => toggleOrderType(opt.val)}
                        className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                          selected
                            ? "border-[#00BFA6] bg-[#00BFA6]/20 text-[#00BFA6]"
                            : "border-[#2A2A2A] bg-[#0D0D0D] text-white/40 hover:text-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* STEP: ITEMS */}
          {currentStep.id === "items" && (
            <>
              <ItemsCSVUpload
                onItemsConfirmed={(newItems) => setItems(newItems)}
                onCancel={undefined}
              />
              <p className="text-xs text-white/60 mt-4">
                {validItemsCount} item{validItemsCount !== 1 ? "s" : ""} added
              </p>
            </>
          )}

          {/* STEP: REVIEW */}
          {currentStep.id === "review" && (
            <>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Ready to create</p>
                  <p className="mt-1 text-xs text-emerald-400/70">
                    Campaign will be saved as <span className="font-bold uppercase">Draft</span>. Activate it from the campaigns list when you are ready.
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-3">
                <ReviewRow label="Name" value={name} />
                <ReviewRow label="Description" value={description || "—"} />
                <ReviewRow
                  label="Type"
                  value={
                    <span className="flex items-center gap-2">
                      <span>{selectedTypeMeta?.icon}</span>
                      <span>{selectedTypeMeta?.label}</span>
                    </span>
                  }
                />
                <ReviewRow
                  label="Period"
                  value={
                    <span>
                      {startDate} → {endDate}
                      {durationDays !== null && (
                        <span className="ml-2 text-white/40">({durationDays} days)</span>
                      )}
                    </span>
                  }
                />
                <ReviewRow
                  label="Audience"
                  value={
                    targetAudience === "all"
                      ? "All Dealers"
                      : targetAudience === "group"
                      ? `Group: ${targetDealerGroup}`
                      : "Individual Dealers"
                  }
                />
                <ReviewRow
                  label="Min Credit Limit"
                  value={minCreditLimit ? `EGP ${Number(minCreditLimit).toLocaleString()}` : "No minimum"}
                />
                <ReviewRow
                  label="Min Target %"
                  value={minTargetPct ? `${minTargetPct}%` : "No minimum"}
                />
                <ReviewRow
                  label="Financial Status"
                  value={
                    <div className="flex flex-wrap gap-1.5">
                      {financialStatus.map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="border-[#2A2A2A] text-white/60 uppercase text-[10px]"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  }
                />
                <ReviewRow
                  label="Order Types"
                  value={
                    orderTypes.length === 0 ? (
                      "All types"
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {orderTypes.map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="border-[#2A2A2A] text-white/60 uppercase text-[10px]"
                          >
                            {t === "air_dhl" ? "Air/DHL" : t}
                          </Badge>
                        ))}
                      </div>
                    )
                  }
                />
                <ReviewRow
                  label="Items"
                  value={
                    <span>
                      <span className="font-bold text-white">{validItemsCount}</span>
                      <span className="text-white/40"> part{validItemsCount !== 1 ? "s" : ""} configured</span>
                    </span>
                  }
                />
              </div>

              {/* Validation surface */}
              {!allValid && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Some steps need attention
                  </p>
                  <ul className="space-y-1 text-xs text-red-400/80">
                    {STEPS.slice(0, -1).map((s) =>
                      stepErrors[s.id].map((err, i) => (
                        <li key={`${s.id}-${i}`}>
                          <button
                            onClick={() => goToStep(STEPS.findIndex((x) => x.id === s.id))}
                            className="underline hover:text-red-300"
                          >
                            [{s.label}]
                          </button>{" "}
                          {err}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Inline step errors (not on review step) */}
          {currentStep.id !== "review" && currentStepErrors.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <ul className="space-y-1 text-xs text-red-400">
                {currentStepErrors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation footer */}
      <div className="flex items-center justify-between gap-3 pb-8">
        <button
          onClick={goBack}
          disabled={stepIndex === 0}
          className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white/60 transition hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/admin/campaigns")}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white/40 transition hover:text-white"
          >
            Cancel
          </button>

          {currentStep.id !== "review" ? (
            <button
              onClick={goNext}
              disabled={!stepIsValid(currentStep.id)}
              className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#00BFA6]/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || !allValid}
              className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#00BFA6]/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Create Campaign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">{label}</p>
      <div className="col-span-2 text-sm text-white">{value}</div>
    </div>
  );
}
