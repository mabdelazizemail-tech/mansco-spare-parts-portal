"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PortalProvider } from "@/lib/portal-data";
import { CartProvider } from "@/lib/cart";
import { CartFloatingIndicator } from "@/components/orders/cart-floating-indicator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalProvider>
      <CartProvider>
        <div className="flex min-h-screen bg-background">
          {/* Sidebar - hidden on mobile */}
          <Sidebar />
          {/* Main column */}
          <div className="flex flex-1 flex-col">
            <Header />
            <main className="flex-1 overflow-x-hidden">
              <div className="container-portal py-6 md:py-8 fade-in">
                {children}
              </div>
            </main>
          </div>
          {/* Floating cart indicator — visible when items are in cart */}
          <CartFloatingIndicator />
        </div>
      </CartProvider>
    </PortalProvider>
  );
}
