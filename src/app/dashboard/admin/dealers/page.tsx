"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Edit,
  Eye,
  Search,
  Users,
  Loader2,
  RefreshCw,
  X,
  Save,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Hash,
  FileText,
  Shield,
  Calendar,
  Ban,
  CheckCircle2,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Dealer = {
  id: string;
  code: string | null;
  email: string;
  company_name: string;
  contact_person: string;
  phone: string | null;
  tax_id: string | null;
  branch_address: string | null;
  dealer_type: string;
  parent_dealer_code: string | null;
  credit_limit: number;
  overdue_balance: number;
  financial_status: string;
  registration_status: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  blocked: "bg-red-500/20 text-red-400 border-red-500/30",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Preview Panel ──────────────────────────────────────────────────────
function DealerPreview({
  dealer,
  onClose,
  onEdit,
}: {
  dealer: Dealer;
  onClose: () => void;
  onEdit: () => void;
}) {
  const rows: { icon: React.ReactNode; label: string; value: string | React.ReactNode }[] = [
    { icon: <Building2 className="h-4 w-4" />, label: "Company", value: dealer.company_name },
    { icon: <Hash className="h-4 w-4" />, label: "Dealer Code", value: dealer.code || "Not Assigned" },
    { icon: <Mail className="h-4 w-4" />, label: "Email", value: dealer.email },
    { icon: <Users className="h-4 w-4" />, label: "Contact Person", value: dealer.contact_person },
    { icon: <Phone className="h-4 w-4" />, label: "Phone", value: dealer.phone || "—" },
    { icon: <FileText className="h-4 w-4" />, label: "Tax ID", value: dealer.tax_id || "—" },
    { icon: <MapPin className="h-4 w-4" />, label: "Branch Address", value: dealer.branch_address || "—" },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Type",
      value: (
        <Badge variant="outline" className="border-[#2A2A2A] text-white/60 uppercase text-[10px]">
          {dealer.dealer_type === "sub_dealer" ? "Sub-Dealer" : "Dealer"}
        </Badge>
      ),
    },
    {
      icon: <CreditCard className="h-4 w-4" />,
      label: "Credit Limit",
      value: formatCurrency(dealer.credit_limit),
    },
    {
      icon: <CreditCard className="h-4 w-4" />,
      label: "Overdue Balance",
      value: (
        <span className={dealer.overdue_balance > 0 ? "text-red-400 font-semibold" : ""}>
          {formatCurrency(dealer.overdue_balance)}
        </span>
      ),
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Financial Status",
      value: (
        <Badge
          variant="outline"
          className={`${statusStyles[dealer.financial_status] ?? "border-[#2A2A2A] text-white/40"} uppercase font-semibold text-[10px]`}
        >
          {dealer.financial_status}
        </Badge>
      ),
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Active",
      value: dealer.is_active ? (
        <span className="text-emerald-400">Yes</span>
      ) : (
        <span className="text-red-400">No</span>
      ),
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: "Registered",
      value: formatDate(dealer.created_at),
    },
  ];

  if (dealer.parent_dealer_code) {
    rows.splice(8, 0, {
      icon: <Hash className="h-4 w-4" />,
      label: "Parent Dealer",
      value: dealer.parent_dealer_code,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 h-full w-full max-w-md overflow-y-auto border-l border-[#2A2A2A] bg-[#111111]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A] bg-[#111111] p-4">
          <div>
            <h2 className="text-lg font-bold text-white">{dealer.company_name}</h2>
            <p className="text-xs text-white/40">{dealer.code || "No code assigned"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:border-[#00BFA6]/50 hover:text-[#00BFA6]"
            >
              <Edit className="mr-1.5 inline h-3 w-3" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/40 transition hover:bg-[#2A2A2A] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-1 p-4">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-white/[0.02]"
            >
              <div className="mt-0.5 text-white/20">{row.icon}</div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider text-white/30">{row.label}</p>
                <div className="mt-0.5 text-sm text-white">{row.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────
function DealerEditModal({
  dealer,
  onClose,
  onSaved,
}: {
  dealer: Dealer;
  onClose: () => void;
  onSaved: (updated: Dealer) => void;
}) {
  const [form, setForm] = useState({
    code: dealer.code ?? "",
    company_name: dealer.company_name,
    contact_person: dealer.contact_person,
    phone: dealer.phone ?? "",
    tax_id: dealer.tax_id ?? "",
    branch_address: dealer.branch_address ?? "",
    dealer_type: dealer.dealer_type,
    parent_dealer_code: dealer.parent_dealer_code ?? "",
    credit_limit: dealer.credit_limit,
    overdue_balance: dealer.overdue_balance,
    financial_status: dealer.financial_status,
    is_active: dealer.is_active,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const { code: _, ...formWithoutCode } = form;
      const payload = {
        ...formWithoutCode,
        credit_limit: Number(form.credit_limit),
        overdue_balance: Number(form.overdue_balance),
      };
      const res = await fetch(`/api/dealers/${dealer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to update");
      }
      const body = await res.json();
      onSaved(body.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update dealer");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const fieldClass =
    "h-9 w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none focus:ring-1 focus:ring-[#00BFA6]/30";
  const labelClass = "text-xs font-medium text-white/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[#2A2A2A] bg-[#111111] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A] bg-[#111111] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Edit Dealer</h2>
            <p className="text-xs text-white/40">{dealer.company_name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-[#2A2A2A] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className={labelClass}>Company Name</Label>
              <input
                className={fieldClass}
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
              />
            </div>
            <div>
              <Label className={labelClass}>Dealer Code</Label>
              <input
                className={fieldClass}
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="e.g. DLR-001"
              />
            </div>
            <div>
              <Label className={labelClass}>Type</Label>
              <select
                className={fieldClass}
                value={form.dealer_type}
                onChange={(e) => set("dealer_type", e.target.value)}
              >
                <option value="dealer">Dealer</option>
                <option value="sub_dealer">Sub-Dealer</option>
              </select>
            </div>
            <div>
              <Label className={labelClass}>Contact Person</Label>
              <input
                className={fieldClass}
                value={form.contact_person}
                onChange={(e) => set("contact_person", e.target.value)}
              />
            </div>
            <div>
              <Label className={labelClass}>Phone</Label>
              <input
                className={fieldClass}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+20..."
              />
            </div>
            <div>
              <Label className={labelClass}>Tax ID</Label>
              <input
                className={fieldClass}
                value={form.tax_id}
                onChange={(e) => set("tax_id", e.target.value)}
              />
            </div>
            <div>
              <Label className={labelClass}>Parent Dealer Code</Label>
              <input
                className={fieldClass}
                value={form.parent_dealer_code}
                onChange={(e) => set("parent_dealer_code", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="col-span-2">
              <Label className={labelClass}>Branch Address</Label>
              <input
                className={fieldClass}
                value={form.branch_address}
                onChange={(e) => set("branch_address", e.target.value)}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#2A2A2A]" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>Credit Limit (EGP)</Label>
              <input
                type="number"
                className={fieldClass}
                value={form.credit_limit}
                onChange={(e) => set("credit_limit", e.target.value)}
              />
            </div>
            <div>
              <Label className={labelClass}>Overdue Balance (EGP)</Label>
              <input
                type="number"
                className={fieldClass}
                value={form.overdue_balance}
                onChange={(e) => set("overdue_balance", e.target.value)}
              />
            </div>
            <div>
              <Label className={labelClass}>Financial Status</Label>
              <select
                className={fieldClass}
                value={form.financial_status}
                onChange={(e) => set("financial_status", e.target.value)}
              >
                <option value="active">Active</option>
                <option value="warning">Warning</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                  className="h-4 w-4 rounded border-[#2A2A2A] bg-[#0D0D0D] accent-[#00BFA6]"
                />
                <span className="text-sm text-white/60">Account Active</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-[#2A2A2A] bg-[#111111] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#00BFA6]/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Credit Management Modal ────────────────────────────────────────────
function CreditManagementModal({
  dealer,
  onClose,
  onSaved,
}: {
  dealer: Dealer;
  onClose: () => void;
  onSaved: (updated: Dealer) => void;
}) {
  const [creditLimit, setCreditLimit] = useState(dealer.credit_limit);
  const [overdueBalance, setOverdueBalance] = useState(dealer.overdue_balance);
  const [financialStatus, setFinancialStatus] = useState(dealer.financial_status);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "payment" | "adjust">("overview");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const utilizationPct =
    creditLimit > 0 ? Math.min((overdueBalance / creditLimit) * 100, 100) : 0;
  const availableCredit = Math.max(creditLimit - overdueBalance, 0);

  const utilizationColor =
    utilizationPct >= 90
      ? "bg-red-500"
      : utilizationPct >= 70
      ? "bg-yellow-500"
      : utilizationPct >= 40
      ? "bg-blue-500"
      : "bg-emerald-500";

  const utilizationTextColor =
    utilizationPct >= 90
      ? "text-red-400"
      : utilizationPct >= 70
      ? "text-yellow-400"
      : utilizationPct >= 40
      ? "text-blue-400"
      : "text-emerald-400";

  const suggestedStatus =
    utilizationPct >= 100 ? "blocked" : utilizationPct >= 80 ? "warning" : "active";

  const handleRecordPayment = () => {
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      setError("Enter a valid payment amount");
      return;
    }
    if (amt > overdueBalance) {
      setError(`Payment cannot exceed overdue balance of ${formatCurrency(overdueBalance)}`);
      return;
    }
    setOverdueBalance((prev) => Math.max(prev - amt, 0));
    setPaymentAmount("");
    setError("");
    setSuccessMsg(`Payment of ${formatCurrency(amt)} applied — click Save to persist.`);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleAdjustCredit = (direction: "increase" | "decrease") => {
    const amt = Number(adjustAmount);
    if (!amt || amt <= 0) {
      setError("Enter a valid adjustment amount");
      return;
    }
    if (!adjustReason.trim()) {
      setError("Please provide a reason for the adjustment");
      return;
    }
    if (direction === "increase") {
      setCreditLimit((prev) => prev + amt);
      setSuccessMsg(`Credit limit increased by ${formatCurrency(amt)} — click Save to persist.`);
    } else {
      if (amt > creditLimit) {
        setError("Decrease amount exceeds current credit limit");
        return;
      }
      setCreditLimit((prev) => Math.max(prev - amt, 0));
      setSuccessMsg(`Credit limit decreased by ${formatCurrency(amt)} — click Save to persist.`);
    }
    setAdjustAmount("");
    setAdjustReason("");
    setError("");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        company_name: dealer.company_name,
        contact_person: dealer.contact_person,
        phone: dealer.phone ?? "",
        tax_id: dealer.tax_id ?? "",
        branch_address: dealer.branch_address ?? "",
        dealer_type: dealer.dealer_type,
        parent_dealer_code: dealer.parent_dealer_code ?? "",
        credit_limit: Number(creditLimit),
        overdue_balance: Number(overdueBalance),
        financial_status: financialStatus,
        is_active: dealer.is_active,
      };
      const res = await fetch(`/api/dealers/${dealer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to update");
      }
      const body = await res.json();
      onSaved(body.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update credit settings");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "h-10 w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none focus:ring-1 focus:ring-[#00BFA6]/30";

  const presetAmounts = [10000, 50000, 100000, 250000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-[#2A2A2A] bg-[#111111] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A] bg-[#111111] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#00BFA6]/10 p-2">
              <Wallet className="h-5 w-5 text-[#00BFA6]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Credit Management</h2>
              <p className="text-xs text-white/40">
                {dealer.company_name} {dealer.code && `· ${dealer.code}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-[#2A2A2A] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Credit Health Summary */}
        <div className="border-b border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111] p-6">
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">
                Credit Limit
              </p>
              <p className="text-xl font-bold text-white">{formatCurrency(creditLimit)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">
                Overdue Balance
              </p>
              <p
                className={`text-xl font-bold ${
                  overdueBalance > 0 ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {formatCurrency(overdueBalance)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">
                Available Credit
              </p>
              <p
                className={`text-xl font-bold ${
                  availableCredit > 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatCurrency(availableCredit)}
              </p>
            </div>
          </div>

          {/* Utilization Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/60">Credit Utilization</span>
              <span className={`text-sm font-bold ${utilizationTextColor}`}>
                {utilizationPct.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#0D0D0D] border border-[#2A2A2A]">
              <div
                className={`h-full ${utilizationColor} transition-all duration-500`}
                style={{ width: `${utilizationPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-white/30">
              <span>0%</span>
              <span>40%</span>
              <span>70%</span>
              <span>90%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Recommended Status */}
          {suggestedStatus !== financialStatus && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-yellow-400">
                  Based on utilization, financial status should be{" "}
                  <span className="font-bold uppercase">{suggestedStatus}</span> (currently{" "}
                  <span className="font-bold uppercase">{financialStatus}</span>)
                </p>
                <button
                  onClick={() => setFinancialStatus(suggestedStatus)}
                  className="mt-1.5 text-xs font-semibold text-yellow-400 underline hover:text-yellow-300"
                >
                  Apply suggested status →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2A2A2A] px-6">
          {[
            { key: "overview", label: "Overview", icon: <DollarSign className="h-3.5 w-3.5" /> },
            { key: "payment", label: "Record Payment", icon: <ArrowDownCircle className="h-3.5 w-3.5" /> },
            { key: "adjust", label: "Adjust Credit", icon: <TrendingUp className="h-3.5 w-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition border-b-2 ${
                activeTab === tab.key
                  ? "border-[#00BFA6] text-[#00BFA6]"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            {successMsg}
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                  Credit Limit (EGP)
                </label>
                <input
                  type="number"
                  className={fieldClass}
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(Number(e.target.value))}
                  min="0"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {presetAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCreditLimit(amt)}
                      className="rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-2.5 py-1 text-[10px] font-semibold text-white/60 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6]"
                    >
                      {formatCurrency(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                  Overdue Balance (EGP)
                </label>
                <input
                  type="number"
                  className={fieldClass}
                  value={overdueBalance}
                  onChange={(e) => setOverdueBalance(Number(e.target.value))}
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                  Financial Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "active", label: "✓ Active", color: "emerald" },
                    { val: "warning", label: "⚠ Warning", color: "yellow" },
                    { val: "blocked", label: "🚫 Blocked", color: "red" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setFinancialStatus(opt.val)}
                      className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                        financialStatus === opt.val
                          ? opt.color === "emerald"
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                            : opt.color === "yellow"
                            ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                            : "border-red-500 bg-red-500/20 text-red-400"
                          : "border-[#2A2A2A] bg-[#1A1A1A] text-white/40 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "payment" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                <p className="text-xs text-white/40 mb-1">Current Outstanding Balance</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(overdueBalance)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                  Payment Amount (EGP)
                </label>
                <input
                  type="number"
                  className={fieldClass}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  max={overdueBalance}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => setPaymentAmount(String(overdueBalance * 0.25))}
                    className="rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-2.5 py-1 text-[10px] font-semibold text-white/60 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6]"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setPaymentAmount(String(overdueBalance * 0.5))}
                    className="rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-2.5 py-1 text-[10px] font-semibold text-white/60 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6]"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setPaymentAmount(String(overdueBalance * 0.75))}
                    className="rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-2.5 py-1 text-[10px] font-semibold text-white/60 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6]"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setPaymentAmount(String(overdueBalance))}
                    className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                  >
                    Full Payment
                  </button>
                </div>
              </div>

              {paymentAmount && Number(paymentAmount) > 0 && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <p className="text-xs text-white/60 mb-2">After this payment:</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Remaining Balance</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {formatCurrency(Math.max(overdueBalance - Number(paymentAmount), 0))}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleRecordPayment}
                disabled={!paymentAmount || Number(paymentAmount) <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowDownCircle className="h-4 w-4" />
                Record Payment
              </button>
            </div>
          )}

          {activeTab === "adjust" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                <p className="text-xs text-white/40 mb-1">Current Credit Limit</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(creditLimit)}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                  Adjustment Amount (EGP)
                </label>
                <input
                  type="number"
                  className={fieldClass}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                  Reason for Adjustment *
                </label>
                <textarea
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none focus:ring-1 focus:ring-[#00BFA6]/30 resize-none"
                  rows={3}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g., Annual review increase, payment history improvement..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleAdjustCredit("increase")}
                  disabled={!adjustAmount || !adjustReason.trim()}
                  className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  Increase Limit
                </button>
                <button
                  onClick={() => handleAdjustCredit("decrease")}
                  disabled={!adjustAmount || !adjustReason.trim()}
                  className="flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Minus className="h-4 w-4" />
                  Decrease Limit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-[#2A2A2A] bg-[#111111] px-6 py-4">
          <p className="text-xs text-white/40">Changes apply on Save</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#00BFA6]/90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ──────────────────────────────────────────
function DealerDeleteModal({
  dealer,
  onClose,
  onDeleted,
}: {
  dealer: Dealer;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const matches =
    confirmText.trim().toLowerCase() === dealer.company_name.toLowerCase();

  const handleDelete = async () => {
    if (!matches) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/dealers/${dealer.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_company_name: confirmText.trim() }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to delete dealer");
      }
      onDeleted(dealer.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete dealer");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-xl border border-red-500/30 bg-[#111111] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#2A2A2A] px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Delete Dealer</h2>
              <p className="text-xs text-white/40">This action removes portal access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-[#2A2A2A] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-400 leading-relaxed">
                You are about to delete{" "}
                <span className="font-bold">{dealer.company_name}</span>
                {dealer.code && (
                  <span className="font-mono"> ({dealer.code})</span>
                )}
                . The dealer will be hidden from the directory and will lose
                portal access. Existing orders, invoices, and shipments remain
                intact. This can be reversed by an admin.
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-white/50">
              Type{" "}
              <span className="font-mono text-white">{dealer.company_name}</span>{" "}
              to confirm
            </Label>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={dealer.company_name}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white placeholder:text-white/20 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
              disabled={deleting}
            />
            {confirmText.length > 0 && !matches && (
              <p className="mt-1.5 text-[11px] text-red-400/80">
                Doesn&apos;t match yet — type the company name exactly.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#2A2A2A] bg-[#0D0D0D] px-6 py-4 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!matches || deleting}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete Dealer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function AdminDealersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "suspended">("all");
  const [filterType, setFilterType] = useState<"all" | "dealer" | "sub_dealer">("all");
  const [filterFinancial, setFilterFinancial] = useState<"all" | "active" | "warning" | "blocked">("all");

  const [previewDealer, setPreviewDealer] = useState<Dealer | null>(null);
  const [editDealer, setEditDealer] = useState<Dealer | null>(null);
  const [creditDealer, setCreditDealer] = useState<Dealer | null>(null);
  const [deleteDealer, setDeleteDealer] = useState<Dealer | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dealers");
      if (!res.ok) throw new Error("Failed to fetch dealers");
      const body = await res.json();
      setDealers(body.data ?? []);
    } catch {
      setError("Failed to load dealers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDealers();
  }, [fetchDealers]);

  const handleSaved = (updated: Dealer) => {
    setDealers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setEditDealer(null);
    setCreditDealer(null);
    // If preview is open for the same dealer, update it too
    if (previewDealer?.id === updated.id) {
      setPreviewDealer(updated);
    }
  };

  const handleToggleSuspend = async (dealer: Dealer) => {
    const shouldSuspend = dealer.is_active;
    const confirmMsg = shouldSuspend
      ? `Suspend ${dealer.company_name}? They will be blocked from accessing the portal.`
      : `Reactivate ${dealer.company_name}? They will regain portal access.`;
    if (!confirm(confirmMsg)) return;

    setSuspendingId(dealer.id);
    try {
      const res = await fetch(`/api/dealers/${dealer.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend: shouldSuspend }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to update");
      }
      const body = await res.json();
      setDealers((prev) => prev.map((d) => (d.id === body.data.id ? body.data : d)));
      if (previewDealer?.id === body.data.id) setPreviewDealer(body.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update dealer status");
    } finally {
      setSuspendingId(null);
    }
  };

  // Remove a soft-deleted dealer from the in-memory list and close any
  // open panels showing that dealer.
  const handleDeleted = (deletedId: string) => {
    setDealers((prev) => prev.filter((d) => d.id !== deletedId));
    setDeleteDealer(null);
    if (previewDealer?.id === deletedId) setPreviewDealer(null);
    if (editDealer?.id === deletedId) setEditDealer(null);
    if (creditDealer?.id === deletedId) setCreditDealer(null);
  };

  const filtered = dealers.filter((d) => {
    // Search filter
    const matchesSearch =
      d.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (d.branch_address ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (d.code ?? "").toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase()) ||
      d.contact_person.toLowerCase().includes(search.toLowerCase());

    // Status filter
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && d.is_active) ||
      (filterStatus === "suspended" && !d.is_active);

    // Type filter
    const matchesType =
      filterType === "all" ||
      (filterType === "dealer" && d.dealer_type === "dealer") ||
      (filterType === "sub_dealer" && d.dealer_type === "sub_dealer");

    // Financial status filter
    const matchesFinancial =
      filterFinancial === "all" ||
      (d.is_active && d.financial_status === filterFinancial);

    return matchesSearch && matchesStatus && matchesType && matchesFinancial;
  });

  // Calculate statistics
  const active = dealers.filter((d) => d.is_active).length;
  const suspended = dealers.filter((d) => !d.is_active).length;
  const subDealers = dealers.filter((d) => d.dealer_type === "sub_dealer").length;
  const totalCreditLimit = dealers.reduce((sum, d) => sum + (d.credit_limit || 0), 0);
  const totalOverdue = dealers.reduce((sum, d) => sum + (d.overdue_balance || 0), 0);
  const financialWarning = dealers.filter((d) => d.is_active && d.financial_status === "warning").length;
  const financialBlocked = dealers.filter((d) => d.is_active && d.financial_status === "blocked").length;
  const totalAvailableCredit = Math.max(totalCreditLimit - totalOverdue, 0);
  const portfolioUtilization =
    totalCreditLimit > 0 ? (totalOverdue / totalCreditLimit) * 100 : 0;
  const highUtilization = dealers.filter(
    (d) => d.credit_limit > 0 && d.overdue_balance / d.credit_limit >= 0.8
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t("admin.dealer_management")}
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Manage dealer accounts, credit limits, and access permissions.
          </p>
        </div>
        <button
          onClick={fetchDealers}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white/60 transition hover:border-[#3A3A3A] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-[#00BFA6]/10 p-3">
              <Users className="h-5 w-5 text-[#00BFA6]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40">Total Dealers</p>
              <p className="mt-1 text-2xl font-bold text-white">{dealers.length}</p>
              <p className="text-xs text-white/30 mt-1">{subDealers} sub-dealers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">Active Accounts</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">{active}</p>
            <p className="text-xs text-white/30 mt-1">
              {((active / dealers.length) * 100).toFixed(0)}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-white/40 font-semibold">Total Credit Limit</p>
            <p className="mt-2 text-2xl font-bold text-white">{formatCurrency(totalCreditLimit)}</p>
            <p className="text-xs text-white/30 mt-1">
              Available: <span className="text-emerald-400">{formatCurrency(totalAvailableCredit)}</span>
            </p>
            {totalCreditLimit > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#0D0D0D]">
                <div
                  className={`h-full ${
                    portfolioUtilization >= 80
                      ? "bg-red-500"
                      : portfolioUtilization >= 50
                      ? "bg-yellow-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(portfolioUtilization, 100)}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
          <CardContent className="p-6">
            <p className={`text-xs uppercase tracking-wider font-semibold ${totalOverdue > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {totalOverdue > 0 ? "⚠️ Overdue Balance" : "✓ Clear Balances"}
            </p>
            <p className={`mt-2 text-2xl font-bold ${totalOverdue > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {formatCurrency(totalOverdue)}
            </p>
            <p className="text-xs text-white/30 mt-1">
              {dealers.filter((d) => d.overdue_balance > 0).length} dealers with balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards for Issues */}
      {(suspended > 0 || financialWarning > 0 || financialBlocked > 0) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {suspended > 0 && (
            <Card className="border-red-500/30 bg-red-500/10">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-red-400">⚠️ Suspended Accounts</p>
                <p className="mt-2 text-2xl font-bold text-red-400">{suspended}</p>
                <p className="text-xs text-red-400/60 mt-1">Blocked from portal access</p>
              </CardContent>
            </Card>
          )}

          {financialWarning > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/10">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-yellow-400">⚡ Financial Warning</p>
                <p className="mt-2 text-2xl font-bold text-yellow-400">{financialWarning}</p>
                <p className="text-xs text-yellow-400/60 mt-1">Approaching credit limit</p>
              </CardContent>
            </Card>
          )}

          {financialBlocked > 0 && (
            <Card className="border-red-500/30 bg-red-500/10">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-red-400">🚫 Blocked</p>
                <p className="mt-2 text-2xl font-bold text-red-400">{financialBlocked}</p>
                <p className="text-xs text-red-400/60 mt-1">Cannot place new orders</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Credit Portfolio Overview */}
      <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Wallet className="h-4 w-4 text-[#00BFA6]" />
            Credit Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">
                Portfolio Utilization
              </p>
              <p
                className={`text-xl font-bold ${
                  portfolioUtilization >= 80
                    ? "text-red-400"
                    : portfolioUtilization >= 50
                    ? "text-yellow-400"
                    : "text-emerald-400"
                }`}
              >
                {portfolioUtilization.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">
                Available Credit
              </p>
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(totalAvailableCredit)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">
                Avg Credit / Dealer
              </p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(dealers.length > 0 ? totalCreditLimit / dealers.length : 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">
                High Utilization (≥80%)
              </p>
              <p
                className={`text-xl font-bold ${
                  highUtilization > 0 ? "text-yellow-400" : "text-emerald-400"
                }`}
              >
                {highUtilization} <span className="text-xs text-white/40">dealers</span>
              </p>
            </div>
          </div>

          {/* Portfolio Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                Credit Distribution
              </span>
              <span className="text-[10px] text-white/40">
                {formatCurrency(totalOverdue)} used of {formatCurrency(totalCreditLimit)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#0D0D0D] border border-[#2A2A2A]">
              <div
                className={`h-full transition-all duration-500 ${
                  portfolioUtilization >= 80
                    ? "bg-red-500"
                    : portfolioUtilization >= 50
                    ? "bg-yellow-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(portfolioUtilization, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Section */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg text-white">Dealer Directory</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                placeholder="Search by name, email, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full md:w-80 border-[#2A2A2A] bg-[#111111] ps-9 text-white placeholder:text-white/30"
              />
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-[#00BFA6]"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-[#00BFA6]"
              >
                <option value="all">All Types</option>
                <option value="dealer">Dealer</option>
                <option value="sub_dealer">Sub-Dealer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                Financial Status
              </label>
              <select
                value={filterFinancial}
                onChange={(e) => setFilterFinancial(e.target.value as any)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-[#00BFA6]"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="warning">Warning</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                Results
              </label>
              <div className="flex items-center justify-center h-10 rounded-lg border border-[#2A2A2A] bg-[#111111] text-sm text-white">
                {filtered.length} of {dealers.length}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader className="pb-0">
          <CardTitle className="text-base text-white">All Dealers Table</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && dealers.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-white/30" />
            </div>
          ) : dealers.length === 0 ? (
            <div className="py-16 text-center text-white/30">
              No dealers found. Approved dealer registrations will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                    <TableHead className="text-white/50 font-semibold">Company</TableHead>
                    <TableHead className="text-white/50 font-semibold">Contact</TableHead>
                    <TableHead className="text-white/50 font-semibold">Type</TableHead>
                    <TableHead className="text-white/50 font-semibold">Registered</TableHead>
                    <TableHead className="text-end text-white/50 font-semibold">Credit Limit</TableHead>
                    <TableHead className="text-end text-white/50 font-semibold">Overdue</TableHead>
                    <TableHead className="text-white/50 font-semibold">Account</TableHead>
                    <TableHead className="text-end text-white/50 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow className="border-[#2A2A2A]">
                      <TableCell colSpan={8} className="py-12 text-center">
                        <p className="text-white/40">No dealers match your filters</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((d) => (
                      <TableRow
                        key={d.id}
                        className={`border-[#2A2A2A] transition ${
                          !d.is_active
                            ? "bg-red-500/5 hover:bg-red-500/10"
                            : d.overdue_balance > 0
                            ? "bg-yellow-500/5 hover:bg-yellow-500/10"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-semibold text-white truncate">
                              {d.company_name}
                            </p>
                            <p className="text-xs text-white/40 truncate">{d.email}</p>
                            {d.code && (
                              <p className="text-xs text-white/30 font-mono mt-1">
                                Code: {d.code}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-white">{d.contact_person}</p>
                            <p className="text-xs text-white/40">
                              {d.phone || "No phone"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`uppercase text-[10px] ${
                              d.dealer_type === "sub_dealer"
                                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                : "border-[#2A2A2A] text-white/60"
                            }`}
                          >
                            {d.dealer_type === "sub_dealer"
                              ? "Sub-Dealer"
                              : "Dealer"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-white/60">
                          {formatDate(d.created_at)}
                        </TableCell>
                        <TableCell className="text-end font-mono font-semibold text-white">
                          {formatCurrency(d.credit_limit)}
                        </TableCell>
                        <TableCell className="text-end">
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`font-mono font-semibold ${
                                d.overdue_balance > 0 ? "text-red-400" : "text-white/60"
                              }`}
                            >
                              {formatCurrency(d.overdue_balance)}
                            </span>
                            {d.credit_limit > 0 && (() => {
                              const pct = Math.min(
                                (d.overdue_balance / d.credit_limit) * 100,
                                100
                              );
                              const barColor =
                                pct >= 90
                                  ? "bg-red-500"
                                  : pct >= 70
                                  ? "bg-yellow-500"
                                  : pct >= 40
                                  ? "bg-blue-500"
                                  : "bg-emerald-500";
                              const textColor =
                                pct >= 90
                                  ? "text-red-400"
                                  : pct >= 70
                                  ? "text-yellow-400"
                                  : pct >= 40
                                  ? "text-blue-400"
                                  : "text-emerald-400";
                              return (
                                <div className="flex items-center gap-1.5 w-full max-w-[120px]">
                                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#0D0D0D]">
                                    <div
                                      className={`h-full ${barColor}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className={`text-[9px] font-semibold ${textColor}`}>
                                    {pct.toFixed(0)}%
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {!d.is_active ? (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 uppercase font-semibold text-[10px] justify-center">
                                🚫 Suspended
                              </Badge>
                            ) : (
                              <Badge
                                className={`uppercase font-semibold text-[10px] justify-center ${
                                  statusStyles[d.financial_status] ||
                                  "border-[#2A2A2A] text-white/40"
                                }`}
                              >
                                {d.financial_status === "active"
                                  ? "✓ Active"
                                  : d.financial_status === "warning"
                                  ? "⚠️ Warning"
                                  : "🚫 Blocked"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-white/40 hover:text-[#00BFA6] hover:bg-[#00BFA6]/10"
                              onClick={() => setPreviewDealer(d)}
                              title="Preview dealer details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-white/40 hover:text-yellow-400 hover:bg-yellow-500/10"
                              onClick={() => setCreditDealer(d)}
                              title="Manage credit & overdue balance"
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5"
                              onClick={() => setEditDealer(d)}
                              title="Edit dealer information"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-8 w-8 p-0 ${
                                d.is_active
                                  ? "text-white/40 hover:text-red-400 hover:bg-red-500/10"
                                  : "text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                              onClick={() => handleToggleSuspend(d)}
                              disabled={suspendingId === d.id}
                              title={
                                d.is_active
                                  ? "Suspend dealer account"
                                  : "Reactivate dealer account"
                              }
                            >
                              {suspendingId === d.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : d.is_active ? (
                                <Ban className="h-4 w-4" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => setDeleteDealer(d)}
                              title="Delete dealer record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Side Panel */}
      {previewDealer && (
        <DealerPreview
          dealer={previewDealer}
          onClose={() => setPreviewDealer(null)}
          onEdit={() => {
            setEditDealer(previewDealer);
          }}
        />
      )}

      {/* Edit Modal */}
      {editDealer && (
        <DealerEditModal
          dealer={editDealer}
          onClose={() => setEditDealer(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Credit Management Modal */}
      {creditDealer && (
        <CreditManagementModal
          dealer={creditDealer}
          onClose={() => setCreditDealer(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteDealer && (
        <DealerDeleteModal
          dealer={deleteDealer}
          onClose={() => setDeleteDealer(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
