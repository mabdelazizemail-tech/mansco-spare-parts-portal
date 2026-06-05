"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

type ActiveCampaign = {
  id: string;
  name: string;
  description: string;
  endDate: string;
  coverImageUrl: string | null;
  discountLabel: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
function daysLeftFrom(end: string): number {
  return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / DAY_MS));
}

export function CampaignBanner() {
  const [featured, setFeatured] = useState<ActiveCampaign | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/campaigns/active")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((body) => {
        const list: ActiveCampaign[] = body.data ?? [];
        // The active endpoint returns soonest-ending first; feature the first
        // one that actually has a cover image.
        const withCover = list.find((c) => c.coverImageUrl) ?? null;
        if (!cancelled) setFeatured(withCover);
      })
      .catch(() => {
        if (!cancelled) setFeatured(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!featured || !featured.coverImageUrl) return null;
  const left = daysLeftFrom(featured.endDate);

  return (
    <Link
      href="/dashboard/campaigns"
      className="group relative block h-44 w-full overflow-hidden rounded-2xl border border-[#2A2A2A]"
    >
      <Image
        src={featured.coverImageUrl}
        alt={featured.name}
        fill
        sizes="100vw"
        className="object-cover transition duration-500 group-hover:scale-105"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />
      <div className="relative z-10 flex h-full max-w-xl flex-col justify-center gap-2 p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#00BFA6]/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#00BFA6]">
            Campaign
          </span>
          {featured.discountLabel && (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white">
              {featured.discountLabel}
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-white">{featured.name}</h2>
        {featured.description && (
          <p className="line-clamp-1 text-sm text-white/60">{featured.description}</p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-white/50">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {left} day{left !== 1 ? "s" : ""} left
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-[#00BFA6]">
            View campaigns
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
