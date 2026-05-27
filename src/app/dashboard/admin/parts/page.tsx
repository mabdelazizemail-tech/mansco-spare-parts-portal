"use client";

import { useState } from "react";
import { Package, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PartsBulkUpload from "@/components/admin/parts-bulk-upload";

export default function AdminPartsPage() {
  const [lastUploadStats, setLastUploadStats] = useState<{
    inserted: number;
    updated: number;
    failed: number;
  } | null>(null);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-[#00BFA6]/10 p-2">
          <Package className="h-6 w-6 text-[#00BFA6]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Parts Catalog</h1>
          <p className="mt-0.5 text-sm text-white/40">
            Bulk-upload new parts and update existing ones via CSV or Excel
          </p>
        </div>
      </div>

      {lastUploadStats && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <p className="text-sm text-emerald-400">
              <strong>Last upload:</strong> {lastUploadStats.inserted} new parts inserted,{" "}
              {lastUploadStats.updated} existing parts updated
              {lastUploadStats.failed > 0 ? `, ${lastUploadStats.failed} failed` : ""}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Database className="h-4 w-4 text-[#00BFA6]" />
            Bulk Upload
          </CardTitle>
          <p className="text-xs text-white/40">
            CSV columns: Part Number, Name (EN), Name (AR), Category, Model, Price, Currency
          </p>
        </CardHeader>
        <CardContent>
          <PartsBulkUpload onComplete={setLastUploadStats} />
        </CardContent>
      </Card>

      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="text-sm text-white/60">How upload works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-white/60">
          <p>
            <strong className="text-white/80">Upsert behavior:</strong> When a Part Number already exists in the catalog, its Name (EN/AR), Category, and Model are updated. New Part Numbers are inserted as new rows.
          </p>
          <p>
            <strong className="text-white/80">Pricing:</strong> Prices and currencies are written to a managed price list called &quot;Admin Bulk Upload&quot;. This list is created automatically the first time you upload.
          </p>
          <p>
            <strong className="text-white/80">Limits:</strong> Up to 5,000 rows per upload. Files up to 5 MB.
          </p>
          <p>
            <strong className="text-white/80">SAP sync:</strong> This is independent of the scheduled SAP CSV sync — uploaded parts will be merged with SAP data on the next sync.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
