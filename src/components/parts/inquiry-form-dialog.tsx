"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

interface InquiryFormDialogProps {
  partNumber: string;
  partName: string;
  availability: string;
  dealerId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (inquiryId: string) => void;
}

export function InquiryFormDialog({
  partNumber,
  partName,
  availability,
  dealerId,
  isOpen,
  onOpenChange,
  onSuccess,
}: InquiryFormDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/parts/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealer_id: dealerId,
          part_number: partNumber,
          quantity,
          inquiry_type: "search",
          message,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to submit inquiry");
      }

      const data = await res.json();
      onSuccess?.(data.data.inquiry_id);
      onOpenChange(false);
      setQuantity(1);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#1A1A1A] border-[#2A2A2A]">
        <DialogHeader>
          <DialogTitle className="text-white">Submit Inquiry</DialogTitle>
          <DialogDescription className="text-white/60">
            Request information about this unavailable part
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-white/5 border border-[#2A2A2A] p-3">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-white/70">
                  <div className="font-medium text-white">{partNumber}</div>
                  <div>{partName}</div>
                  <div className="text-xs text-white/50 mt-1">Status: {availability}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Quantity Needed</Label>
            <Input
              type="number"
              min="1"
              max="9999"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-white/30"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Additional Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Let us know any special requirements or urgency..."
              className="bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-white/30 resize-none"
              rows={3}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-[#2A2A2A] text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#00BFA6] text-white hover:bg-[#00BFA6]/90"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? "Submitting..." : "Submit Inquiry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
