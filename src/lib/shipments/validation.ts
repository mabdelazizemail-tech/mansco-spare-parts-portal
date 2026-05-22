export type CarrierCode = "dhl" | "fedex" | "mansco" | "other";
export type ShipmentStatus =
  | "pending" | "packed" | "shipped" | "in_transit" | "delivered"
  | "exception" | "returned" | "cancelled";

export interface TrackingRefs {
  tracking_number?: string | null;
  awb_number?: string | null;
  dhl_reference?: string | null;
}

export interface LineQtyData {
  ordered_qty: number;
  already_shipped: number;
}

export function validateCarrierCode(code: unknown): code is CarrierCode {
  return ["dhl", "fedex", "mansco", "other"].includes(code as string);
}

export function validateTrackingRefs(carrier: CarrierCode, refs: TrackingRefs): boolean {
  const hasTrackingNumber = !!refs.tracking_number;
  const hasAwb = !!refs.awb_number;
  const hasDhl = !!refs.dhl_reference;

  // At least one ref required
  if (!hasTrackingNumber && !hasAwb && !hasDhl) {
    return false;
  }

  // Carrier-specific validation could go here (Phase 2+)
  // For Phase 1, any combination is acceptable
  return true;
}

export function validateStatusTransition(fromStatus: ShipmentStatus, toStatus: ShipmentStatus): boolean {
  // Exception and returned can be reached from any state
  if (toStatus === "exception" || toStatus === "returned" || toStatus === "cancelled") {
    return true;
  }

  const validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
    pending: ["packed", "exception", "returned", "cancelled"],
    packed: ["shipped", "exception", "returned", "cancelled"],
    shipped: ["in_transit", "exception", "returned"],
    in_transit: ["delivered", "exception", "returned"],
    delivered: [], // terminal state
    exception: ["returned", "shipped"], // can retry from exception
    returned: [], // terminal state
    cancelled: [], // terminal state
  };

  return validTransitions[fromStatus]?.includes(toStatus) ?? false;
}

export function validateShippedQty(shippedQty: number, lineData: LineQtyData): boolean {
  if (shippedQty <= 0) return false;

  const available = lineData.ordered_qty - lineData.already_shipped;
  return shippedQty <= available;
}

export function getTrackingRefErrorMessages(carrier: CarrierCode, refs: TrackingRefs): string[] {
  const errors: string[] = [];

  if (!refs.tracking_number && !refs.awb_number && !refs.dhl_reference) {
    errors.push("At least one tracking reference is required");
  }

  return errors;
}

export function getShippedQtyErrorMessage(requested: number, lineData: LineQtyData): string {
  const available = lineData.ordered_qty - lineData.already_shipped;
  return `Requested ${requested} units but only ${available} available (${lineData.ordered_qty} ordered, ${lineData.already_shipped} already shipped)`;
}
