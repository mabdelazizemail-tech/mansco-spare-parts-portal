"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import type { Dealer } from "@/lib/mock-data";

interface DealerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealer: Dealer | null;
  onSave: (dealer: Dealer) => void;
}

export function DealerEditDialog({
  open,
  onOpenChange,
  dealer,
  onSave,
}: DealerEditDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Dealer | null>(null);

  useEffect(() => {
    if (dealer) setForm({ ...dealer });
  }, [dealer]);

  if (!form) return null;

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.editDealer")}</DialogTitle>
          <DialogDescription>{form.name} - {form.branch}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Credit Limit */}
          <div className="space-y-2">
            <Label>{t("admin.creditLimit")}</Label>
            <Input
              type="number"
              value={form.creditLimit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, creditLimit: Number(e.target.value) })
              }
            />
          </div>

          {/* Financial Status */}
          <div className="space-y-2">
            <Label>{t("dashboard.financial_status")}</Label>
            <Select
              value={form.financialStatus}
              onValueChange={(val: string) =>
                setForm({
                  ...form,
                  financialStatus: val as Dealer["financialStatus"],
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="green">Green - Good Standing</SelectItem>
                <SelectItem value="yellow">Yellow - Warning</SelectItem>
                <SelectItem value="red">Red - Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stock Visibility Permissions */}
          <div className="space-y-2">
            <Label>{t("admin.stockVisibility")}</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.stockVisibility.daily}
                  onCheckedChange={(checked: boolean) =>
                    setForm({
                      ...form,
                      stockVisibility: {
                        ...form.stockVisibility,
                        daily: checked,
                      },
                    })
                  }
                />
                {t("dashboard.daily")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.stockVisibility.airDHL}
                  onCheckedChange={(checked: boolean) =>
                    setForm({
                      ...form,
                      stockVisibility: {
                        ...form.stockVisibility,
                        airDHL: checked,
                      },
                    })
                  }
                />
                {t("dashboard.air_dhl")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.stockVisibility.stock}
                  onCheckedChange={(checked: boolean) =>
                    setForm({
                      ...form,
                      stockVisibility: {
                        ...form.stockVisibility,
                        stock: checked,
                      },
                    })
                  }
                />
                {t("dashboard.stock")}
              </label>
            </div>
          </div>

          {/* Discount Eligibility Toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={form.discountEligible}
                onCheckedChange={(checked: boolean) =>
                  setForm({ ...form, discountEligible: checked })
                }
              />
              {t("admin.discountEligible")}
            </label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("common.save").replace("Save", "Notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setForm({ ...form, notes: e.target.value })
              }
              placeholder="Add notes about this dealer..."
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t("common.cancel")}
          </DialogClose>
          <Button onClick={handleSave}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
