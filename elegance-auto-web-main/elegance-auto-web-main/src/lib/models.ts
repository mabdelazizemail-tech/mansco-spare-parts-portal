import suvImg from "@/assets/model-suv.jpg";
import sedanImg from "@/assets/model-sedan.jpg";
import hatchImg from "@/assets/model-hatch.jpg";
import evImg from "@/assets/model-ev.jpg";
import interiorImg from "@/assets/detail-interior.jpg";
import bannerImg from "@/assets/banner-promo.jpg";
import heroImg from "@/assets/hero-car.jpg";

export type Model = {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  startingPrice: string;
  image: string;
  gallery: string[];
  features: { title: string; description: string }[];
  specs: { label: string; value: string }[];
};

export const models: Model[] = [
  {
    slug: "aura-s7",
    name: "Aura S7",
    tagline: "Pure Sport. Refined.",
    category: "Sport Sedan",
    startingPrice: "From $48,900",
    image: sedanImg,
    gallery: [sedanImg, heroImg, interiorImg, bannerImg],
    features: [
      { title: "Adaptive Dynamics", description: "Real-time chassis adjustments calibrated to road and driver." },
      { title: "Aero-Sculpted Body", description: "Wind-tunnel forged silhouette with active aero elements." },
      { title: "Driver-Centric Cockpit", description: "Wraparound digital cluster and floating curved display." },
    ],
    specs: [
      { label: "Power", value: "340 hp" },
      { label: "0–100 km/h", value: "5.2 s" },
      { label: "Top Speed", value: "260 km/h" },
      { label: "Drivetrain", value: "AWD" },
      { label: "Transmission", value: "8-Speed Auto" },
      { label: "Fuel Economy", value: "7.8 L/100km" },
    ],
  },
  {
    slug: "aura-x5",
    name: "Aura X5",
    tagline: "Elevated Versatility.",
    category: "Compact SUV",
    startingPrice: "From $42,500",
    image: suvImg,
    gallery: [suvImg, interiorImg, heroImg, bannerImg],
    features: [
      { title: "Intelligent AWD", description: "Predictive torque distribution across all conditions." },
      { title: "Panoramic Roof", description: "Edge-to-edge glass with electrochromic dimming." },
      { title: "Cargo Architecture", description: "Modular interior with up to 1,920 L of usable space." },
    ],
    specs: [
      { label: "Power", value: "280 hp" },
      { label: "0–100 km/h", value: "6.8 s" },
      { label: "Top Speed", value: "230 km/h" },
      { label: "Drivetrain", value: "AWD" },
      { label: "Cargo", value: "1,920 L" },
      { label: "Fuel Economy", value: "8.4 L/100km" },
    ],
  },
  {
    slug: "aura-c1",
    name: "Aura C1",
    tagline: "City Sculpted.",
    category: "Hatchback",
    startingPrice: "From $26,400",
    image: hatchImg,
    gallery: [hatchImg, interiorImg, heroImg, bannerImg],
    features: [
      { title: "Compact Footprint", description: "Engineered for tight urban environments without compromise." },
      { title: "Connected Cabin", description: "Wireless charging, integrated assistant, and ambient lighting." },
      { title: "Efficient Powertrain", description: "Mild-hybrid system delivering best-in-class economy." },
    ],
    specs: [
      { label: "Power", value: "155 hp" },
      { label: "0–100 km/h", value: "8.1 s" },
      { label: "Top Speed", value: "210 km/h" },
      { label: "Drivetrain", value: "FWD" },
      { label: "Cargo", value: "380 L" },
      { label: "Fuel Economy", value: "5.4 L/100km" },
    ],
  },
  {
    slug: "aura-e9",
    name: "Aura E9",
    tagline: "Electric. Unbound.",
    category: "Electric Crossover",
    startingPrice: "From $58,000",
    image: evImg,
    gallery: [evImg, interiorImg, bannerImg, heroImg],
    features: [
      { title: "520 km Range", description: "Long-range battery architecture for extended journeys." },
      { title: "Ultra-Fast Charging", description: "10–80% in under 25 minutes on DC fast charge." },
      { title: "Silent Performance", description: "Dual-motor instant torque with cinematic refinement." },
    ],
    specs: [
      { label: "Power", value: "408 hp" },
      { label: "0–100 km/h", value: "4.6 s" },
      { label: "Top Speed", value: "240 km/h" },
      { label: "Range (WLTP)", value: "520 km" },
      { label: "Battery", value: "82 kWh" },
      { label: "DC Charge", value: "180 kW" },
    ],
  },
];

export const getModel = (slug: string) => models.find((m) => m.slug === slug);
