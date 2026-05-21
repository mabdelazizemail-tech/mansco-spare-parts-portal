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
          <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
            {t("admin.reports")}
          </h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            Operational analytics, inquiries, and lost-sales tracking.
          </p>
        </div>
        <Button variant="outline">
          <Download className="me-2 h-4 w-4" /> {t("common.export")}
        </Button>
      </div>

      <Tabs defaultValue="operational" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
          <TabsTrigger value="lost-sales">Lost Sales</TabsTrigger>
        </TabsList>

        {/* OPERATIONAL */}
        <TabsContent value="operational" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Orders by Status</CardTitle>
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
                    <Tooltip />
                    <Legend
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Order Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revenueByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#00A3E0" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* INQUIRIES */}
        <TabsContent value="inquiries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inquiry Report</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Part #</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inquiries.map((inq) => (
                    <TableRow key={inq.id}>
                      <TableCell className="text-sm">
                        {inq.createdAt.slice(0, 10)}
                      </TableCell>
                      <TableCell>{dealerName(inq.dealerId)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {inq.partNumber}
                      </TableCell>
                      <TableCell className="max-w-md truncate text-sm text-[#6B6B6B]">
                        {inq.message}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
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
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-red-100 p-3">
                  <TrendingDown className="h-5 w-5 text-red-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#000000]">{lostSales.length}</p>
                  <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">
                    Lost Sales
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-amber-100 p-3">
                  <FileText className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#000000]">
                    {formatCurrency(lostRevenue)}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">
                    Est. Lost Revenue
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-emerald-100 p-3">
                  <TrendingUp className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#000000]">
                    {dealers.length}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-[#6B6B6B]">
                    Dealers Reporting
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lost Sales Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Part #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-end">Est. Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lostSales.map((ls) => (
                    <TableRow key={ls.id}>
                      <TableCell className="text-sm">
                        {ls.createdAt.slice(0, 10)}
                      </TableCell>
                      <TableCell>{dealerName(ls.dealerId)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {ls.partNumber}
                      </TableCell>
                      <TableCell>{ls.customerName}</TableCell>
                      <TableCell className="max-w-xs text-sm text-[#6B6B6B]">
                        {ls.reason}
                      </TableCell>
                      <TableCell className="text-end font-mono font-semibold text-red-700">
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
