"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import { campaigns } from "@/lib/mock-data";

export function CampaignsSection() {
  const activeCampaigns = campaigns.slice(0, 2);

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2A2A2A]">
          <Megaphone className="h-4 w-4 text-white/60" />
        </div>
        <h2 className="text-lg font-semibold text-white">Active Campaigns</h2>
      </div>

      <div className="space-y-4">
        {activeCampaigns.map((campaign, i) => {
          const discountColor = i === 0 ? "text-teal-400" : "text-orange-400";
          const untilDate = new Date(campaign.validUntil).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <div
              key={campaign.id}
              className="flex items-center justify-between rounded-lg border border-[#2A2A2A] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{campaign.title}</p>
                <p className="text-xs text-white/30">until {untilDate}</p>
              </div>
              <span className={`text-sm font-semibold ${discountColor}`}>
                -{campaign.discountPercent}%
              </span>
            </div>
          );
        })}
      </div>

      <Link
        href="/campaigns"
        className="mt-4 block text-sm text-white/50 transition hover:text-white"
      >
        All campaigns &rarr;
      </Link>
    </div>
  );
}
