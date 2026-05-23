"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  FileText,
  MapPin,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

type FormErrors = Record<string, string[] | undefined>;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    company_name: "",
    contact_person: "",
    phone: "",
    tax_id: "",
    commercial_register_number: "",
    branch_address: "",
    dealer_type_requested: "dealer" as "dealer" | "sub_dealer",
    parent_dealer_code: "",
  });

  const [files, setFiles] = useState<Record<string, File | null>>({
    trade_license: null,
    tax_card: null,
    commercial_register_doc: null,
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep1 = () => {
    const errs: FormErrors = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = ["Please enter a valid email"];
    if (form.password.length < 8)
      errs.password = ["At least 8 characters"];
    else if (!/[A-Z]/.test(form.password))
      errs.password = ["Must contain an uppercase letter"];
    else if (!/[0-9]/.test(form.password))
      errs.password = ["Must contain a number"];
    if (form.password !== form.confirm_password)
      errs.confirm_password = ["Passwords do not match"];
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: FormErrors = {};
    if (form.company_name.length < 2)
      errs.company_name = ["Company name is required"];
    if (form.contact_person.length < 2)
      errs.contact_person = ["Contact person is required"];
    if (!/^\+?[0-9]{10,15}$/.test(form.phone))
      errs.phone = ["Enter a valid phone number"];
    if (form.tax_id.length < 5) errs.tax_id = ["Tax ID is required"];
    if (form.commercial_register_number.length < 3)
      errs.commercial_register_number = ["CR number is required"];
    if (form.branch_address.length < 10)
      errs.branch_address = ["Please provide a full address"];
    if (
      form.dealer_type_requested === "sub_dealer" &&
      !form.parent_dealer_code
    )
      errs.parent_dealer_code = ["Required for sub-dealers"];
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setServerError("");

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      Object.entries(files).forEach(([k, v]) => {
        if (v) formData.append(k, v);
      });

      const res = await fetch("/api/registration", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json();
        setServerError(
          body.error?.message || "Registration failed. Please try again."
        );
        setLoading(false);
        return;
      }

      router.push("/pending-approval");
    } catch {
      setServerError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pl-11 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400";
  const errorInputClass =
    "h-12 w-full rounded-lg border border-red-300 bg-red-50/50 px-4 pl-11 text-sm text-gray-900 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
      {/* LEFT: Hero */}
      <div className="relative hidden overflow-hidden bg-[#111111] lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute bottom-0 right-0 h-[60%] w-[60%] bg-gradient-to-tl from-[#C41E3A]/30 via-[#D4622C]/15 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[40%] w-[50%] bg-gradient-to-tr from-[#C41E3A]/10 to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden">
              <Image
                src="/logo.png"
                alt="MANSCO"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-[0.1em] text-white">
                MANSCO
              </span>
              <span className="text-[10px] font-medium tracking-[0.15em] text-white/50">
                SPARE PARTS PORTAL
              </span>
            </div>
          </div>

          <div className="max-w-xl space-y-8">
            <h1 className="text-[2.75rem] font-bold leading-[1.15] text-white">
              Join Peugeot Egypt&apos;s
              <br />
              dealer network.
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-white/50">
              Register your dealership to access self-service ordering,
              <br />
              real-time availability, and financial tools.
            </p>

            <div className="grid grid-cols-2 gap-x-10 gap-y-3 pt-2">
              {[
                "Self-service spare parts ordering",
                "Real-time SAP availability",
                "Credit & financial visibility",
                "Campaign & discount access",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-white/30" />
                  <span className="text-sm text-white/60">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/25">
            &copy; MANSCO Egypt &middot; Operated for Peugeot Egypt
          </p>
        </div>
      </div>

      {/* RIGHT: Registration Form */}
      <div className="flex flex-col bg-white px-10 py-8 overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C41E3A]">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <span className="text-sm font-bold text-gray-900">
              MANSCO Portal
            </span>
          </div>

          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
            Dealer Registration
          </p>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mb-6 text-sm text-gray-400">
            Complete the form below. Your registration will be reviewed by an
            admin.
          </p>

          {/* Step indicators */}
          <div className="mb-8 flex items-center gap-2">
            {["Account", "Business Info", "Documents"].map((label, i) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    step > i + 1
                      ? "bg-green-500 text-white"
                      : step === i + 1
                      ? "bg-[#1B2332] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {step > i + 1 ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    step === i + 1 ? "text-gray-900" : "text-gray-300"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {serverError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}

          {/* STEP 1: Account */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="dealer@company.eg"
                    className={errors.email ? errorInputClass : inputClass}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    className={errors.password ? errorInputClass : inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={form.confirm_password}
                    onChange={(e) => update("confirm_password", e.target.value)}
                    placeholder="Re-enter your password"
                    className={
                      errors.confirm_password ? errorInputClass : inputClass
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="text-xs text-red-500">
                    {errors.confirm_password[0]}
                  </p>
                )}
              </div>

              <button
                onClick={handleNext}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1B2332] text-[11px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#2a3444]"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* STEP 2: Business Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">
                  Company Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    value={form.company_name}
                    onChange={(e) => update("company_name", e.target.value)}
                    placeholder="Your company name"
                    className={
                      errors.company_name ? errorInputClass : inputClass
                    }
                  />
                </div>
                {errors.company_name && (
                  <p className="text-xs text-red-500">
                    {errors.company_name[0]}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900">
                    Contact Person
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      value={form.contact_person}
                      onChange={(e) => update("contact_person", e.target.value)}
                      placeholder="Full name"
                      className={
                        errors.contact_person ? errorInputClass : inputClass
                      }
                    />
                  </div>
                  {errors.contact_person && (
                    <p className="text-xs text-red-500">
                      {errors.contact_person[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="+201234567890"
                      className={errors.phone ? errorInputClass : inputClass}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-500">{errors.phone[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900">
                    Tax ID
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      value={form.tax_id}
                      onChange={(e) => update("tax_id", e.target.value)}
                      placeholder="Tax ID number"
                      className={errors.tax_id ? errorInputClass : inputClass}
                    />
                  </div>
                  {errors.tax_id && (
                    <p className="text-xs text-red-500">{errors.tax_id[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900">
                    CR Number
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      value={form.commercial_register_number}
                      onChange={(e) =>
                        update("commercial_register_number", e.target.value)
                      }
                      placeholder="Commercial register #"
                      className={
                        errors.commercial_register_number
                          ? errorInputClass
                          : inputClass
                      }
                    />
                  </div>
                  {errors.commercial_register_number && (
                    <p className="text-xs text-red-500">
                      {errors.commercial_register_number[0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">
                  Branch Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    value={form.branch_address}
                    onChange={(e) => update("branch_address", e.target.value)}
                    placeholder="Full branch address"
                    className={
                      errors.branch_address ? errorInputClass : inputClass
                    }
                  />
                </div>
                {errors.branch_address && (
                  <p className="text-xs text-red-500">
                    {errors.branch_address[0]}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">
                  Dealer Type
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <select
                    value={form.dealer_type_requested}
                    onChange={(e) =>
                      update(
                        "dealer_type_requested",
                        e.target.value as "dealer" | "sub_dealer"
                      )
                    }
                    className="h-12 w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 pl-11 pr-10 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="dealer">Dealer</option>
                    <option value="sub_dealer">Sub-Dealer</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {form.dealer_type_requested === "sub_dealer" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900">
                    Parent Dealer Code
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      value={form.parent_dealer_code}
                      onChange={(e) =>
                        update("parent_dealer_code", e.target.value)
                      }
                      placeholder="e.g. CAI-001"
                      className={
                        errors.parent_dealer_code ? errorInputClass : inputClass
                      }
                    />
                  </div>
                  {errors.parent_dealer_code && (
                    <p className="text-xs text-red-500">
                      {errors.parent_dealer_code[0]}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex h-12 flex-1 items-center justify-center rounded-lg border border-gray-200 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-600 transition hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-[#1B2332] text-[11px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#2a3444]"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Documents */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Upload the required documents. Accepted formats: PDF, JPG, PNG
                (max 5MB each).
              </p>

              {[
                { key: "trade_license", label: "Trade License" },
                { key: "tax_card", label: "Tax Card" },
                {
                  key: "commercial_register_doc",
                  label: "Commercial Register Document",
                },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900">
                    {label}
                  </label>
                  <label className="flex h-20 cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 transition hover:border-gray-300 hover:bg-gray-50">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setFiles((prev) => ({ ...prev, [key]: file }));
                      }}
                    />
                    {files[key] ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        {files[key]!.name}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <FileText className="h-4 w-4" />
                        Click to upload {label.toLowerCase()}
                      </div>
                    )}
                  </label>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex h-12 flex-1 items-center justify-center rounded-lg border border-gray-200 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-600 transition hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-[#1B2332] text-[11px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#2a3444] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Registration
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              href="/"
              className="font-medium text-gray-900 underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
