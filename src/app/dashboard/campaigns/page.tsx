"use client";

import { campaigns } from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Tag,
  ArrowRight,
} from "lucide-react";

// Group campaigns by active vs expiring soon
const now = new Date();
const oneWeek = 7 * 24 * 60 * 60 * 1000;

const activeCampaigns = campaigns.filter(
  (c) => new Date(c.endDate).getTime() - now.getTime() > oneWeek
);
const expiringSoon = campaigns.filter(
  (c) => {
    const diff = new Date(c.endDate).getTime() - now.getTime();
    return diff > 0 && diff <= oneWeek;
  }
);
const expired = campaigns.filter(
  (c) => new Date(c.endDate).getTime() <= now.getTime()
);

const gradients = [
  "from-[#00BFA6]/20 to-[#00BFA6]/5",
  "from-blue-500/20 to-blue-500/5",
  "from-purple-500/20 to-purple-500/5",
  "from-orange-500/20 to-orange-500/5",
];

function CampaignCard({ campaign, idx }: { campaign: typeof campaigns[0]; idx: number }) {
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(campaign.endDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  );
  const isExpired = daysLeft === 0;

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#2A2A2A] bg-gradient-to-br p-6 min-h-[200px] ${gradients[idx % gradients.length]}`}
    >
      <div className="flex items-center justify-between">
        <StatusBadge
          tone={isExpired ? "destructive" : daysLeft <= 7 ? "warning" : "success"}
          label={isExpired ? "Expired" : `${daysLeft} days left`}
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white text-sm font-bold">
          {campaign.discountPct}%
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-bold text-white">{campaign.name}</h3>
        <p className="mt-1 text-sm text-white/50 line-clamp-2">{campaign.description}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
          <CalendarDays className="h-3.5 w-3.5" />
          Valid until {new Date(campaign.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  // If no campaigns match the expiring/expired groups, show all as active
  const hasGroups = expiringSoon.length > 0 || expired.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Campaigns</h1>
        <p className="mt-1 text-sm text-white/40">
          Active promotions, regional pushes, and dealer incentives.
        </p>
      </div>

      {/* Active Campaigns */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Tag className="h-4 w-4" /> Active Campaigns
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(hasGroups ? activeCampaigns : campaigns).map((c, i) => (
            <CampaignCard key={c.id} campaign={c} idx={i} />
          ))}
          {(hasGroups ? activeCampaigns : campaigns).length === 0 && (
            <div className="col-span-full flex items-center justify-center rounded-xl border border-dashed border-[#2A2A2A] py-16">
              <p className="text-sm text-white/30">No active campaigns at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Expiring Soon */}
      {expiringSoon.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-orange-400/80 uppercase tracking-wider mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Expiring Soon
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {expiringSoon.map((c, i) => (
              <CampaignCard key={c.id} campaign={c} idx={i + activeCampaigns.length} />
            ))}
          </div>
        </div>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white/30 uppercase tracking-wider mb-4">
            Past Campaigns
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 opacity-50">
            {expired.map((c, i) => (
              <CampaignCard key={c.id} campaign={c} idx={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
