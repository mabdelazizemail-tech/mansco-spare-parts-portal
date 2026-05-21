"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import type { AdminOrder, AdminOrderItem } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/mock-data";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type ApprovalMode = "approve" | "reject" | "partial";

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: AdminOrder | null;
  mode: ApprovalMode;
  onConfirm: (data: {
    mode: ApprovalMode;
    reason?: string;
    approvedItemIds?: string[];
  }) => void;
}

export function ApprovalDialog({
  open,
  onOpenChange,
  order,
  mode,
  onConfirm,
}: ApprovalDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  if (!order) return null;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setReason("");
      setSelectedItems(new Set(order.items.map((item) => item.id)));
    }
    onOpenChange(isOpen);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm({
      mode,
      reason: mode === "reject" ? reason : undefined,
      approvedItemIds:
        mode === "partial" ? Array.from(selectedItems) : undefined,
    });
    onOpenChange(false);
  };

  const approvedTotal = order.items
    .filter((item) => selectedItems.has(item.id))
    .reduce((sum, item) => sum + item.total, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "approve" && (
              <>
                <CheckCircle2 className="size-5 text-green-600" />
                {t("admin.confirmApproval")}
              </>
            )}
            {mode === "reject" && (
              <>
                <XCircle className="size-5 text-red-600" />
                {t("admin.reject")} - {order.id}
              </>
            )}
            {mode === "partial" && (
              <>
                <AlertTriangle className="size-5 text-amber-600" />
                {t("admin.partialApprove")} - {order.id}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "approve" && `${t("admin.orderSummary")} - ${order.id}`}
            {mode === "reject" && t("admin.rejectionReason")}
            {mode === "partial" && t("admin.selectItems")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Order info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">{t("admin.dealerManagement").replace("Management", "").trim()}</div>
            <div className="font-medium">{order.dealerName}</div>
            <div className="text-muted-foreground">{t("dashboard.type")}</div>
            <div className="font-medium">{order.type}</div>
            <div className="text-muted-foreground">{t("dashboard.amount")}</div>
            <div className="font-medium">{formatCurrency(order.totalAmount)}</div>
            <div className="text-muted-foreground">{t("dashboard.items")}</div>
            <div className="font-medium">{order.itemCount} items</div>
          </div>

          {/* Approve mode: just show summary */}
          {mode === "approve" && (
            <div className="rounded-lg border bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">
              This order will be approved and the dealer will be notified.
            </div>
          )}

          {/* Reject mode: reason textarea */}
          {mode === "reject" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("admin.rejectionReason")} *
              </label>
              <Textarea
                value={reason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="min-h-[80px]"
              />
            </div>
          )}

          {/* Partial mode: item selection */}
          {mode === "partial" && (
            <div className="space-y-3">
              <div className="max-h-[250px] space-y-2 overflow-y-auto">
                {order.items.map((item: AdminOrderItem) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{item.partName}</div>
                      <div className="text-muted-foreground">
                        {item.partNumber} | Qty: {item.quantity} |{" "}
                        {formatCurrency(item.total)}
                      </div>
                      <Badge
                        variant={
                          item.availability === "in_stock"
                            ? "default"
                            : item.availability === "backorder"
                            ? "secondary"
                            : "destructive"
                        }
                        className="mt-1"
                      >
                        {item.availability === "in_stock"
                          ? "In Stock"
                          : item.availability === "backorder"
                          ? "Backorder"
                          : "Out of Stock"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                {t("admin.backorderRest")}
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Approved total:</span>
                <span>{formatCurrency(approvedTotal)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t("common.cancel")}
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={mode === "reject" && !reason.trim()}
            className={
              mode === "approve"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : mode === "reject"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            }
          >
            {mode === "approve" && t("admin.approve")}
            {mode === "reject" && t("admin.reject")}
            {mode === "partial" && t("admin.partialApprove")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
