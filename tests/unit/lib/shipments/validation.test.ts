import { describe, it, expect } from "vitest";
import {
  validateCarrierCode,
  validateTrackingRefs,
  validateStatusTransition,
  validateShippedQty,
} from "@/lib/shipments/validation";

describe("shipment validation", () => {
  it("should accept valid carrier codes", () => {
    expect(validateCarrierCode("dhl")).toBe(true);
    expect(validateCarrierCode("fedex")).toBe(true);
    expect(validateCarrierCode("mansco")).toBe(true);
    expect(validateCarrierCode("other")).toBe(true);
  });

  it("should reject invalid carrier codes", () => {
    expect(validateCarrierCode("ups")).toBe(false);
    expect(validateCarrierCode("")).toBe(false);
  });

  it("should require at least one tracking ref", () => {
    expect(validateTrackingRefs("dhl", { tracking_number: "123" })).toBe(true);
    expect(validateTrackingRefs("dhl", { awb_number: "123" })).toBe(true);
    expect(validateTrackingRefs("dhl", {})).toBe(false);
  });

  it("should validate DHL-specific refs", () => {
    const dhlRefs = { tracking_number: "123", awb_number: "456", dhl_reference: "789" };
    expect(validateTrackingRefs("dhl", dhlRefs)).toBe(true);
  });

  it("should reject invalid status transitions", () => {
    expect(validateStatusTransition("pending", "shipped")).toBe(false); // must go packed first
    expect(validateStatusTransition("pending", "packed")).toBe(true);
    expect(validateStatusTransition("delivered", "shipped")).toBe(false); // backwards
    expect(validateStatusTransition("any_status", "exception")).toBe(true); // exception always allowed
  });

  it("should validate shipped qty", () => {
    const lineData = { ordered_qty: 10, already_shipped: 0 };
    expect(validateShippedQty(8, lineData)).toBe(true);
    expect(validateShippedQty(10, lineData)).toBe(true);
    expect(validateShippedQty(11, lineData)).toBe(false); // exceeds available
  });

  it("should track cumulative shipped qty", () => {
    const lineData = { ordered_qty: 10, already_shipped: 5 };
    expect(validateShippedQty(5, lineData)).toBe(true);
    expect(validateShippedQty(6, lineData)).toBe(false); // total would be 11
  });
});
