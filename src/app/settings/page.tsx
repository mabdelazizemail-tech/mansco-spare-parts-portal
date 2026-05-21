"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Bell,
  Lock,
  Shield,
  Eye,
  Download,
  LogOut,
  HelpCircle,
  Zap,
  Moon,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState("en");
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 text-[#00BFA6] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">Settings</h1>
          <p className="mt-2 text-white/40">
            Manage your account preferences and security
          </p>
        </div>

        {/* Preferences Section */}
        <div className="mb-8 space-y-6">
          <div className="border-t border-white/10 pt-8">
            <h2 className="mb-6 text-2xl font-bold text-white">Preferences</h2>

            {/* Language Settings */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                    <Globe className="h-5 w-5 text-[#00BFA6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Language</h3>
                    <p className="text-sm text-white/40">
                      Choose your preferred language for the portal
                    </p>
                  </div>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#00BFA6]/50 focus:ring-1 focus:ring-[#00BFA6]/50"
                >
                  <option value="en">English</option>
                  <option value="ar">العربية (Arabic)</option>
                </select>
              </div>
            </div>

            {/* Theme Settings */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                    <Moon className="h-5 w-5 text-[#00BFA6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Dark Mode</h3>
                    <p className="text-sm text-white/40">
                      Use dark theme for comfortable viewing
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    darkMode ? "bg-[#00BFA6]" : "bg-[#2A2A2A]"
                  }`}
                >
                  <div
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      darkMode ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="border-t border-white/10 pt-8">
            <h2 className="mb-6 text-2xl font-bold text-white">Notifications</h2>

            {/* Order Notifications */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                    <Bell className="h-5 w-5 text-[#00BFA6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      Order Updates
                    </h3>
                    <p className="text-sm text-white/40">
                      Get notifications about order confirmations, shipments,
                      and deliveries
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOrderNotifications(!orderNotifications)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    orderNotifications ? "bg-[#00BFA6]" : "bg-[#2A2A2A]"
                  }`}
                >
                  <div
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      orderNotifications ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                    <Smartphone className="h-5 w-5 text-[#00BFA6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Email Digest</h3>
                    <p className="text-sm text-white/40">
                      Receive weekly summary of your orders and activities
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    emailNotifications ? "bg-[#00BFA6]" : "bg-[#2A2A2A]"
                  }`}
                >
                  <div
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      emailNotifications ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* SMS Notifications */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                    <Zap className="h-5 w-5 text-[#00BFA6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">SMS Alerts</h3>
                    <p className="text-sm text-white/40">
                      Receive critical order alerts via SMS
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSmsNotifications(!smsNotifications)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    smsNotifications ? "bg-[#00BFA6]" : "bg-[#2A2A2A]"
                  }`}
                >
                  <div
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      smsNotifications ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="border-t border-white/10 pt-8">
            <h2 className="mb-6 text-2xl font-bold text-white">Security</h2>

            {/* Password */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                    <Lock className="h-5 w-5 text-[#00BFA6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Password</h3>
                    <p className="text-sm text-white/40">
                      Change your account password
                    </p>
                  </div>
                </div>
                <button className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white/60 transition hover:border-[#3A3A3A] hover:text-white">
                  Change
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                    <Shield className="h-5 w-5 text-[#00BFA6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      Two-Factor Authentication
                    </h3>
                    <p className="text-sm text-white/40">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    twoFactorEnabled ? "bg-[#00BFA6]" : "bg-[#2A2A2A]"
                  }`}
                >
                  <div
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      twoFactorEnabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Privacy */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                    <Eye className="h-5 w-5 text-[#00BFA6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      Privacy Settings
                    </h3>
                    <p className="text-sm text-white/40">
                      Manage data sharing and visibility
                    </p>
                  </div>
                </div>
                <button className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white/60 transition hover:border-[#3A3A3A] hover:text-white">
                  Manage
                </button>
              </div>
            </div>
          </div>

          {/* Data & Account Section */}
          <div className="border-t border-white/10 pt-8">
            <h2 className="mb-6 text-2xl font-bold text-white">
              Data & Account
            </h2>

            {/* Download Data */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                    <Download className="h-5 w-5 text-[#00BFA6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Download Data</h3>
                    <p className="text-sm text-white/40">
                      Export your account data in JSON format
                    </p>
                  </div>
                </div>
                <button className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white/60 transition hover:border-[#3A3A3A] hover:text-white">
                  Download
                </button>
              </div>
            </div>

            {/* Logout */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                    <LogOut className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Sign Out</h3>
                    <p className="text-sm text-white/40">
                      Sign out from your current device
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:border-red-500/40 hover:bg-red-500/20 disabled:opacity-50"
                >
                  {signingOut ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <div className="border-t border-white/10 pt-8">
            <h2 className="mb-6 text-2xl font-bold text-white">Support</h2>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00BFA6]/10">
                    <HelpCircle className="h-5 w-5 text-[#00BFA6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Help Center</h3>
                    <p className="text-sm text-white/40">
                      Visit our help center for documentation and FAQs
                    </p>
                  </div>
                </div>
                <button className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white/60 transition hover:border-[#3A3A3A] hover:text-white">
                  Visit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-2 text-sm text-white/60">
            <p>
              <strong>MANSCO Spare Parts Portal</strong> v1.0.0
            </p>
            <p>© 2026 MANSCO Egypt. Operated for Peugeot Egypt.</p>
            <p>
              For support, contact:{" "}
              <span className="text-[#00BFA6]">support@mansco-eg.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
