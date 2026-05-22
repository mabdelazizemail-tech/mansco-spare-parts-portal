// src/lib/shipments/carrier-config.ts

import type { CarrierCode } from "./validation";

export interface CarrierConfig {
  code: CarrierCode;
  name: string;
  fields: {
    tracking_number: boolean; // show?
    awb_number: boolean;
    dhl_reference: boolean;
  };
  icon: string; // lucide-react icon name
}

export const CARRIERS: Record<CarrierCode, CarrierConfig> = {
  dhl: {
    code: "dhl",
    name: "DHL Express",
    fields: { tracking_number: true, awb_number: true, dhl_reference: true },
    icon: "Package",
  },
  fedex: {
    code: "fedex",
    name: "FedEx",
    fields: { tracking_number: true, awb_number: true, dhl_reference: false },
    icon: "Truck",
  },
  mansco: {
    code: "mansco",
    name: "MANSCO Logistics",
    fields: { tracking_number: true, awb_number: false, dhl_reference: false },
    icon: "Package",
  },
  other: {
    code: "other",
    name: "Other Carrier",
    fields: { tracking_number: true, awb_number: false, dhl_reference: false },
    icon: "Box",
  },
};

export function getCarrierConfig(code: CarrierCode): CarrierConfig {
  return CARRIERS[code];
}

export function getVisibleFields(code: CarrierCode): string[] {
  const config = getCarrierConfig(code);
  return Object.entries(config.fields)
    .filter(([_, show]) => show)
    .map(([field]) => field);
}
