import type { Metadata } from "next";
import { Inter, Montserrat, Hind } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortalProvider } from "@/lib/portal-data";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const hind = Hind({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MANSCO Spare Parts Portal | OriginalParts Hub",
  description:
    "Peugeot Egypt dealer portal for spare parts ordering, tracking, and management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${montserrat.variable} ${hind.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <LocaleProvider>
          <PortalProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </PortalProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
