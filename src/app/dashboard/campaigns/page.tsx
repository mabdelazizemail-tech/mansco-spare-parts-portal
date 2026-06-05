"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { StatusBadge } from "@/components/portal/status-badge";
import { CalendarDays, Tag } from "lucide-react";

type ActiveCampaign = {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string | null;
  campaignType: string;
  startDate: string;
  endDate: string;
  discountLabel: string | null;
  itemCount: number;
};

const gradients = [
  "from-[#00BFA6]/20 to-[#00BFA6]/5",
  "from-blue-500/20 to-blue-500/5",
  "from-purple-500/20 to-purple-500/5",
  "from-orange-500/20 to-orange-500/5",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function daysLeftFrom(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / DAY_MS));
}

function CampaignCard({ campaign, idx }: { campaign: ActiveCampaign; idx: number }) {
  const daysLeft = daysLeftFrom(campaign.endDate);
  const isExpired = daysLeft === 0;
  const hasCover = Boolean(campaign.coverImageUrl);

  return (
    <div
      className={`relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-xl border border-[#2A2A2A] ${
        hasCover ? "bg-[#0D0D0D]" : `bg-gradient-to-br p-6 ${gradients[idx % gradients.length]}`
      }`}
    >
      {hasCover && (
        <>
          <Image
            src={campaign.coverImageUrl as string}
            alt={campaign.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
        </>
      )}

      <div className={`relative z-10 flex flex-1 flex-col justify-between ${hasCover ? "p-6" : ""}`}>
        <div className="flex items-center justify-between">
          <StatusBadge
            tone={isExpired ? "destructive" : daysLeft <= 7 ? "warning" : "success"}
            label={isExpired ? "Expired" : `${daysLeft} days left`}
          />
          {campaign.discountLabel && (
            <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white/10 px-2 text-sm font-bold text-white">
              {campaign.discountLabel}
            </div>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-bold text-white">{campaign.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-white/60">{campaign.description}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
            <CalendarDays className="h-3.5 w-3.5" />
            Valid until{" "}
            {new Date(campaign.endDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="min-h-[200px] animate-pulse rounded-xl border border-[#2A2A2A] bg-[#141414] p-6">
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 rounded-full bg-white/5" />
        <div className="h-10 w-10 rounded-full bg-white/5" />
      </div>
      <div className="mt-8 space-y-2">
        <div className="h-5 w-2/3 rounded bg-white/5" />
        <div className="h-4 w-full rounded bg-white/5" />
        <div className="h-4 w-1/3 rounded bg-white/5" />
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<ActiveCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/campaigns/active");
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message ?? "Failed to load campaigns");
        if (!cancelled) setCampaigns(body.data ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load campaigns");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { active, expiringSoon } = useMemo(() => {
    const expiring: ActiveCampaign[] = [];
    const rest: ActiveCampaign[] = [];
    for (const c of campaigns) {
      const d = daysLeftFrom(c.endDate);
      if (d > 0 && d <= 7) expiring.push(c);
      else rest.push(c);
    }
    return { active: rest, expiringSoon: expiring };
  }, [campaigns]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Campaigns</h1>
        <p className="mt-1 text-sm text-white/40">
          Active promotions, regional pushes, and dealer incentives.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Active Campaigns */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/60">
          <Tag className="h-4 w-4" /> Active Campaigns
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            active.map((c, i) => <CampaignCard key={c.id} campaign={c} idx={i} />)
          )}
          {!loading && active.length === 0 && expiringSoon.length === 0 && !error && (
            <div className="col-span-full flex items-center justify-center rounded-xl border border-dashed border-[#2A2A2A] py-16">
              <p className="text-sm text-white/30">No active campaigns at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Expiring Soon */}
      {!loading && expiringSoon.length > 0 && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-orange-400/80">
            <CalendarDays className="h-4 w-4" /> Expiring Soon
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {expiringSoon.map((c, i) => (
              <CampaignCard key={c.id} campaign={c} idx={i + active.length} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
