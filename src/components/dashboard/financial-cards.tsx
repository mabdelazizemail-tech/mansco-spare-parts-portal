"use client";

import { ClipboardList, CircleDot, TrendingUp } from "lucide-react";

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="mt-4 h-1 w-full rounded-full bg-[#2A2A2A]">
      <div
        className="h-1 rounded-full transition-all"
        style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

interface StatCard {
  label: string;
  value: string;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
  progress?: number;
}

export function FinancialCards() {
  const cards: StatCard[] = [
    {
      label: "Credit Usage",
      value: "39%",
      subtitle: "EGP 15,625,000 of EGP 40,000,000",
      color: "#3B82F6",
      icon: <ClipboardList className="h-5 w-5 text-blue-500" />,
      progress: 39,
    },
    {
      label: "Monthly Target",
      value: "74%",
      subtitle: "EGP 18,600,000 of EGP 25,000,000",
      color: "#10B981",
      icon: <CircleDot className="h-5 w-5 text-green-500" />,
      progress: 74,
    },
    {
      label: "Financial Covering",
      value: "92%",
      subtitle: "All balances current",
      color: "#00BFA6",
      icon: <TrendingUp className="h-5 w-5 text-teal-400" />,
      progress: 92,
    },
    {
      label: "Open Orders",
      value: "3",
      subtitle: "3 back-order lines",
      color: "#3B82F6",
      icon: <ClipboardList className="h-5 w-5 text-blue-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6"
        >
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">
              {card.label}
            </p>
            {card.icon}
          </div>
          <p className="mt-3 text-3xl font-bold text-white">{card.value}</p>
          <p className="mt-1 text-sm text-white/40">{card.subtitle}</p>
          {card.progress !== undefined && (
            <ProgressBar percent={card.progress} color={card.color} />
          )}
        </div>
      ))}
    </div>
  );
}
