import { Megaphone, Tag, Calendar } from "lucide-react";
import { campaigns, allParts } from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/StatusBadge";

const CampaignsPage = () => {
  const grouped = {
    Active: campaigns.filter((c) => c.status === "Active"),
    Planned: campaigns.filter((c) => c.status === "Planned"),
    Ended: campaigns.filter((c) => c.status === "Ended"),
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Commercial</p>
        <h1 className="display-lg">Campaigns & Discounts</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Ongoing and planned marketing activities. Discount items eligible per order type.</p>
      </div>

      {(["Active", "Planned", "Ended"] as const).map((group) => (
        <section key={group} className="space-y-3">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">{group}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {grouped[group].map((c) => {
              const parts = c.skus.map((s) => allParts.find((p) => p.sku === s)).filter(Boolean);
              return (
                <div key={c.id} className="panel p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.id}</p>
                      <h3 className="font-semibold mt-1 leading-tight">{c.title}</h3>
                    </div>
                    <span className={`text-2xl font-bold ${group === "Ended" ? "text-muted-foreground" : "text-success"}`}>-{c.discountPct}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{c.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {c.startDate} → {c.endDate}</span>
                    <StatusBadge tone={group === "Active" ? "bg-success/10 text-success border-success/30" : group === "Planned" ? "bg-info/10 text-info border-info/30" : "bg-muted text-muted-foreground border-border"}>{c.status}</StatusBadge>
                  </div>
                  <div className="border-t border-[hsl(var(--hairline))] pt-3 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" /> Eligible parts</p>
                    {parts.map((p) => (
                      <p key={p!.sku} className="text-xs">{p!.name}</p>
                    ))}
                  </div>
                </div>
              );
            })}
            {grouped[group].length === 0 && (
              <div className="panel p-8 text-center text-muted-foreground text-sm">No {group.toLowerCase()} campaigns.</div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
};

export default CampaignsPage;
