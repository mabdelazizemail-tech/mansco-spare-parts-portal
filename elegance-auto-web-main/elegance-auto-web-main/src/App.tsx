import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortalProvider } from "@/lib/portal-data";
import { I18nProvider } from "@/lib/i18n";
import { PortalLayout } from "@/components/portal/PortalLayout";

import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

import DealerDashboard from "./pages/portal/DealerDashboard";
import PartsInquiry from "./pages/portal/PartsInquiry";
import CartPage from "./pages/portal/CartPage";
import OrdersList from "./pages/portal/OrdersList";
import OrderDetail from "./pages/portal/OrderDetail";
import InvoicesPage from "./pages/portal/InvoicesPage";
import BackOrdersPage from "./pages/portal/BackOrdersPage";
import CampaignsPage from "./pages/portal/CampaignsPage";
import InquiriesLog from "./pages/portal/InquiriesLog";

import AdminDashboard from "./pages/admin/AdminDashboard";
import ApprovalsQueue from "./pages/admin/ApprovalsQueue";
import DealersAdmin from "./pages/admin/DealersAdmin";
import LostSalesReport from "./pages/admin/LostSalesReport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <PortalProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Dealer portal */}
            <Route element={<PortalLayout />}>
              <Route path="/portal" element={<DealerDashboard />} />
              <Route path="/portal/parts" element={<PartsInquiry />} />
              <Route path="/portal/cart" element={<CartPage />} />
              <Route path="/portal/orders" element={<OrdersList />} />
              <Route path="/portal/orders/:id" element={<OrderDetail />} />
              <Route path="/portal/invoices" element={<InvoicesPage />} />
              <Route path="/portal/backorders" element={<BackOrdersPage />} />
              <Route path="/portal/campaigns" element={<CampaignsPage />} />
              <Route path="/portal/inquiries" element={<InquiriesLog />} />
              <Route path="/portal/settings" element={<DealerDashboard />} />

              {/* Admin */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/approvals" element={<ApprovalsQueue />} />
              <Route path="/admin/orders" element={<OrdersList />} />
              <Route path="/admin/orders/:id" element={<OrderDetail />} />
              <Route path="/admin/dealers" element={<DealersAdmin />} />
              <Route path="/admin/campaigns" element={<CampaignsPage />} />
              <Route path="/admin/reports/inquiries" element={<InquiriesLog adminMode />} />
              <Route path="/admin/reports/lost-sales" element={<LostSalesReport />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </PortalProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
