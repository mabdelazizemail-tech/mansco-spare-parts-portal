// tests/integration/api/shipments.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createShipment, addShipmentLine, getShipment } from "@/lib/shipments/service";

describe("shipment API integration", () => {
  const testOrderId = "test-order-001"; // Assumes this exists in test DB
  const testUserId = "test-user-001";
  let shipmentId: string;

  beforeEach(async () => {
    // Clean up any prior test data
    await supabaseAdmin
      .from("shipments")
      .delete()
      .eq("created_by", testUserId);
  });

  it("should create a shipment with all required fields", async () => {
    const shipment = await createShipment(
      {
        order_id: testOrderId,
        carrier_code: "dhl",
        carrier_name: "DHL Express",
        tracking_number: "1234567890",
        awb_number: "ABC123",
        notes: "Test shipment",
      },
      testUserId
    );

    expect(shipment.id).toBeDefined();
    expect(shipment.shipment_number).toMatch(/^SHP-\d+-\d{4}$/);
    expect(shipment.carrier_code).toBe("dhl");
    expect(shipment.shipment_status).toBe("pending");
    expect(shipment.created_by).toBe(testUserId);

    shipmentId = shipment.id;
  });

  it("should reject shipment with no tracking references", async () => {
    expect(
      createShipment(
        {
          order_id: testOrderId,
          carrier_code: "dhl",
        },
        testUserId
      )
    ).rejects.toThrow("At least one tracking reference is required");
  });

  it("should add a line to a shipment", async () => {
    const shipment = await createShipment(
      {
        order_id: testOrderId,
        carrier_code: "fedex",
        tracking_number: "FX12345",
      },
      testUserId
    );

    const line = await addShipmentLine(shipment.id, {
      order_line_id: "test-line-001",
      shipped_qty: 5,
    });

    expect(line.shipment_id).toBe(shipment.id);
    expect(line.order_line_id).toBe("test-line-001");
    expect(line.shipped_qty).toBe(5);
  });

  it("should prevent duplicate order lines in shipment", async () => {
    const shipment = await createShipment(
      {
        order_id: testOrderId,
        carrier_code: "mansco",
        tracking_number: "MANSCO123",
      },
      testUserId
    );

    await addShipmentLine(shipment.id, {
      order_line_id: "test-line-002",
      shipped_qty: 3,
    });

    expect(
      addShipmentLine(shipment.id, {
        order_line_id: "test-line-002",
        shipped_qty: 2,
      })
    ).rejects.toThrow("already in this shipment");
  });

  it("should prevent adding lines to non-pending shipment", async () => {
    const shipment = await createShipment(
      {
        order_id: testOrderId,
        carrier_code: "other",
        tracking_number: "OTHER999",
      },
      testUserId
    );

    // Change status to shipped
    await supabaseAdmin
      .from("shipments")
      .update({ shipment_status: "shipped" })
      .eq("id", shipment.id);

    expect(
      addShipmentLine(shipment.id, {
        order_line_id: "test-line-003",
        shipped_qty: 1,
      })
    ).rejects.toThrow("Cannot add lines");
  });
});
