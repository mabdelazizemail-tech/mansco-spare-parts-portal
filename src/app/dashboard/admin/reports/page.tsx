"use client";

import { Download, TrendingDown, TrendingUp, FileText } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  inquiries,
  lostSales,
  dealers,
  formatCurrency,
  getOrdersByStatus,
  getRevenueByType,
} from "@/lib/mock-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const inquiryStatusStyles: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  replied: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  closed: "bg-white/5 text-white/50 border-[#2A2A2A]",
};

export default function AdminReportsPage() {
  const { t } = useTranslation();
  const dealerName = (id: string) =>
    dealers.find((d) => d.id === id)?.name ?? id;

  const ordersByStatus = getOrdersByStatus();
  const revenueByType = getRevenueByType();
  const lostRevenue = lostSales.reduce((s, l) => s + l.estimatedValue, 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t("admin.reports")}
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Operational analytics, inquiries, and lost-sales tracking.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-[#2A2A2A] bg-[#1A1A1A] text-white/60 hover:border-[#3A3A3A] hover:bg-[#1A1A1A] hover:text-white"
        >
          <Download className="me-2 h-4 w-4" /> {t("common.export")}
        </Button>
      </div>

      <Tabs defaultValue="operational" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 border border-[#2A2A2A] bg-[#1A1A1A]">
          <TabsTrigger
            value="operational"
            className="text-white/60 data-[state=active]:bg-[#00BFA6]/10 data-[state=active]:text-[#00BFA6]"
          >
            Operational
          </TabsTrigger>
          <TabsTrigger
            value="inquiries"
            className="text-white/60 data-[state=active]:bg-[#00BFA6]/10 data-[state=active]:text-[#00BFA6]"
          >
            Inquiries
          </TabsTrigger>
          <TabsTrigger
            value="lost-sales"
            className="text-white/60 data-[state=active]:bg-[#00BFA6]/10 data-[state=active]:text-[#00BFA6]"
          >
            Lost Sales
          </TabsTrigger>
        </TabsList>

        {/* OPERATIONAL */}
        <TabsContent value="operational" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
              <CardHeader>
                <CardTitle className="text-base text-white">Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {ordersByStatus.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0D0D0D",
                        border: "1px solid #2A2A2A",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Legend
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
              <CardHeader>
                <CardTitle className="text-base text-white">Revenue by Order Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revenueByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis
                      dataKey="type"
                      tick={{ fontSize: 12, fill: "rgba(255,255,255,0.6)" }}
                      stroke="#2A2A2A"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }}
                      stroke="#2A2A2A"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0D0D0D",
                        border: "1px solid #2A2A2A",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      labelStyle={{ color: "#fff" }}
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    />
                    <Bar dataKey="revenue" fill="#00BFA6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* INQUIRIES */}
        <TabsContent value="inquiries" className="space-y-6">
          <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-base text-white">Inquiry Report</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                    <TableHead className="text-white/50 font-semibold">Date</TableHead>
                    <TableHead className="text-white/50 font-semibold">Dealer</TableHead>
                    <TableHead className="text-white/50 font-semibold">Part #</TableHead>
                    <TableHead className="text-white/50 font-semibold">Message</TableHead>
                    <TableHead className="text-white/50 font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inquiries.map((inq) => (
                    <TableRow
                      key={inq.id}
                      className="border-[#2A2A2A] transition hover:bg-white/[0.02]"
                    >
                      <TableCell className="text-sm text-white/70">
                        {inq.createdAt.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-white">{dealerName(inq.dealerId)}</TableCell>
                      <TableCell className="font-mono text-xs text-white/70">
                        {inq.partNumber}
                      </TableCell>
                      <TableCell className="max-w-md truncate text-sm text-white/60">
                        {inq.message}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`uppercase font-semibold text-[10px] ${
                            inquiryStatusStyles[inq.status] ?? "border-[#2A2A2A] text-white/50"
                          }`}
                        >
                          {inq.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOST SALES */}
        <TabsContent value="lost-sales" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-red-500/10 p-3">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{lostSales.length}</p>
                  <p className="text-xs uppercase tracking-wider text-white/40">
                    Lost Sales
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <FileText className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(lostRevenue)}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-white/40">
                    Est. Lost Revenue
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#111111]">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-emerald-500/10 p-3">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {dealers.length}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-white/40">
                    Dealers Reporting
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-base text-white">Lost Sales Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                    <TableHead className="text-white/50 font-semibold">Date</TableHead>
                    <TableHead className="text-white/50 font-semibold">Dealer</TableHead>
                    <TableHead className="text-white/50 font-semibold">Part #</TableHead>
                    <TableHead className="text-white/50 font-semibold">Customer</TableHead>
                    <TableHead className="text-white/50 font-semibold">Reason</TableHead>
                    <TableHead className="text-end text-white/50 font-semibold">Est. Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lostSales.map((ls) => (
                    <TableRow
                      key={ls.id}
                      className="border-[#2A2A2A] transition hover:bg-white/[0.02]"
                    >
                      <TableCell className="text-sm text-white/70">
                        {ls.createdAt.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-white">{dealerName(ls.dealerId)}</TableCell>
                      <TableCell className="font-mono text-xs text-white/70">
                        {ls.partNumber}
                      </TableCell>
                      <TableCell className="text-white">{ls.customerName}</TableCell>
                      <TableCell className="max-w-xs text-sm text-white/60">
                        {ls.reason}
                      </TableCell>
                      <TableCell className="text-end font-mono font-semibold text-red-400">
                        {formatCurrency(ls.estimatedValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
