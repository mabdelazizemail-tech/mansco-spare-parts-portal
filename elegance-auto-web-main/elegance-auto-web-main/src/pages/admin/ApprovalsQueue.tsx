import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { usePortal, dealers, formatEGP, orderTypeMeta } from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/StatusBadge";

const ApprovalsQueue = () => {
  const { orders, approveOrder, rejectOrder } = usePortal();
  const queue = orders.filter((o) => o.status === "Under Review");

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Administrator</p>
        <h1 className="display-lg">Approvals Queue</h1>
        <p className="text-sm text-muted-foreground mt-1.5">{queue.length} order{queue.length === 1 ? "" : "s"} awaiting decision.</p>
      </div>

      {queue.length === 0 ? (
        <div className="panel p-12 text-center text-muted-foreground"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" /> No pending approvals.</div>
      ) : (
        <div className="space-y-4">
          {queue.map((o) => {
            const d = dealers.find((x) => x.id === o.dealerId);
            return (
              <div key={o.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <Link to={`/admin/orders/${o.id}`} className="font-semibold hover:text-primary">{o.id}</Link>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <StatusBadge tone={orderTypeMeta[o.type].tone}>{o.type}</StatusBadge>
                      <span className="text-muted-foreground">· {d?.name} ({d?.code})</span>
                    </div>
                  </div>
                  <p className="font-display text-xl font-bold">{formatEGP(o.totalNet)}</p>
                </div>
                <div className="bg-warning/10 border border-warning/30 rounded-md p-3 flex items-start gap-2 text-sm mb-3">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <span>{o.reviewReason}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  {o.lines.length} line{o.lines.length === 1 ? "" : "s"} · Requested {o.requestedDate}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { rejectOrder(o.id, "Rejected — credit limit"); toast({ title: "Order rejected" }); }}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                  <Button onClick={() => { approveOrder(o.id); toast({ title: "Order approved" }); }}>
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalsQueue;
