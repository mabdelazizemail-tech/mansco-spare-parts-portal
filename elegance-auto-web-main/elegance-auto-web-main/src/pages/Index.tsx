import { useEffect } from "react";
import { Hero } from "@/components/Hero";
import { TrustStrip } from "@/components/TrustStrip";
import { CategoryGrid } from "@/components/CategoryGrid";
import { FeaturedParts } from "@/components/FeaturedParts";
import { PromoBanner } from "@/components/PromoBanner";
import { QuickActions } from "@/components/QuickActions";
import { Marquee } from "@/components/Marquee";

const Index = () => {
  useEffect(() => {
    document.title = "Peugeot Egypt — Genuine Spare Parts Online";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Order genuine Peugeot spare parts in Egypt. Backed by manufacturer warranty, with 24-hour Cairo delivery and nationwide shipping.");
  }, []);

  return (
    <>
      <Hero />
      <TrustStrip />
      <CategoryGrid />
      <Marquee />
      <FeaturedParts />
      <PromoBanner />
      <QuickActions />
    </>
  );
};

export default Index;
