import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean up existing data (for fresh seeding)
  console.log("Clearing existing data...");
  await prisma.syncLog.deleteMany();
  await prisma.campaignAuditLog.deleteMany();
  await prisma.campaignOrder.deleteMany();
  await prisma.campaignItem.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.dealerTarget.deleteMany();
  await prisma.orderTimeline.deleteMany();
  await prisma.orderApproval.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.lostSale.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.priceListItem.deleteMany();
  await prisma.priceList.deleteMany();
  await prisma.stockAvailability.deleteMany();
  await prisma.part.deleteMany();
  await prisma.dealerPermission.deleteMany();
  await prisma.dealer.deleteMany();
  await prisma.dealerRegistration.deleteMany();

  console.log("✅ Data cleared");

  // ──────────────────────────────────────────────────────────────────────
  // 1. CREATE DEALERS
  // ──────────────────────────────────────────────────────────────────────

  console.log("\n📍 Creating dealers...");

  const cairo = await prisma.dealer.create({
    data: {
      supabaseUid: "00000000-0000-0000-0000-000000000001",
      code: "dlr-cairo",
      email: "cairo@motors.eg",
      companyName: "Cairo Motors",
      contactPerson: "Ahmed Hassan",
      phone: "+201001234567",
      taxId: "TAX001",
      branchAddress: "Cairo, Egypt",
      dealerType: "dealer",
      creditLimit: 50000,
      financialStatus: "active",
      registrationStatus: "approved",
      approvedAt: new Date(),
      isActive: true,
    },
  });

  const delta = await prisma.dealer.create({
    data: {
      supabaseUid: "00000000-0000-0000-0000-000000000002",
      code: "dlr-delta",
      email: "delta@parts.eg",
      companyName: "Delta Auto Parts",
      contactPerson: "Mohamed Saleh",
      phone: "+201001234568",
      taxId: "TAX002",
      branchAddress: "Giza, Egypt",
      dealerType: "dealer",
      creditLimit: 50000,
      financialStatus: "active",
      registrationStatus: "approved",
      approvedAt: new Date(),
      isActive: true,
    },
  });

  const alexandria = await prisma.dealer.create({
    data: {
      supabaseUid: "00000000-0000-0000-0000-000000000003",
      code: "dlr-alex",
      email: "alex@spare.eg",
      companyName: "Alexandria Spare Parts",
      contactPerson: "Fatima Ahmad",
      phone: "+201001234569",
      taxId: "TAX003",
      branchAddress: "Alexandria, Egypt",
      dealerType: "dealer",
      creditLimit: 50000,
      financialStatus: "active",
      registrationStatus: "approved",
      approvedAt: new Date(),
      isActive: true,
    },
  });

  console.log(`✅ Created 3 dealers:`);
  console.log(`   - ${cairo.companyName} (${cairo.code})`);
  console.log(`   - ${delta.companyName} (${delta.code})`);
  console.log(`   - ${alexandria.companyName} (${alexandria.code})`);

  // ──────────────────────────────────────────────────────────────────────
  // 2. CREATE PARTS
  // ──────────────────────────────────────────────────────────────────────

  console.log("\n📦 Creating parts...");

  const parts = await Promise.all([
    prisma.part.create({
      data: {
        partNumber: "PE-001",
        nameEn: "Timing Belt",
        nameAr: "حزام التوقيت",
        categoryId: "ENGINE",
        model: "206",
        oem: "PE-206-TB",
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PE-002",
        nameEn: "Oil Filter",
        nameAr: "فلتر الزيت",
        categoryId: "ENGINE",
        model: "206",
        oem: "PE-206-OF",
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "BR-001",
        nameEn: "Brake Pads",
        nameAr: "وسائط الفرامل",
        categoryId: "BRAKES",
        model: "206",
        oem: "BR-206-BP",
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "BR-002",
        nameEn: "Brake Disc",
        nameAr: "قرص الفرامل",
        categoryId: "BRAKES",
        model: "206",
        oem: "BR-206-BD",
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "SU-001",
        nameEn: "Suspension Spring",
        nameAr: "نوابض التعليق",
        categoryId: "SUSPENSION",
        model: "206",
        oem: "SU-206-SS",
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "EL-001",
        nameEn: "Alternator",
        nameAr: "المولد",
        categoryId: "ELECTRICAL",
        model: "206",
        oem: "EL-206-ALT",
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "EL-002",
        nameEn: "Starter Motor",
        nameAr: "محرك البدء",
        categoryId: "ELECTRICAL",
        model: "206",
        oem: "EL-206-SM",
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "GE-001",
        nameEn: "Gasket",
        nameAr: "جوان",
        categoryId: "GENERAL",
        model: "206",
        oem: "GE-206-GSK",
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "GE-002",
        nameEn: "Spark Plug",
        nameAr: "شمعة الإشعال",
        categoryId: "GENERAL",
        model: "206",
        oem: "GE-206-SP",
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "GE-003",
        nameEn: "Battery",
        nameAr: "بطارية",
        categoryId: "GENERAL",
        model: "206",
        oem: "GE-206-BAT",
      },
    }),
  ]);

  console.log(`✅ Created ${parts.length} parts`);

  // ──────────────────────────────────────────────────────────────────────
  // 3. CREATE STOCK AVAILABILITY
  // ──────────────────────────────────────────────────────────────────────

  console.log("\n📊 Creating stock availability...");

  await Promise.all(
    parts.map((part) =>
      prisma.stockAvailability.create({
        data: {
          partId: part.id,
          partNumber: part.partNumber,
          quantityAvailable: Math.floor(Math.random() * 100) + 10,
          quantityAtp: Math.floor(Math.random() * 100) + 10,
          sourceLocation: "Cairo Warehouse",
          replenishmentEta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
    )
  );

  console.log(`✅ Created stock records for all parts`);

  // ──────────────────────────────────────────────────────────────────────
  // 4. CREATE PRICE LIST
  // ──────────────────────────────────────────────────────────────────────

  console.log("\n💰 Creating price list...");

  const priceList = await prisma.priceList.create({
    data: {
      name: "Standard Price List 2026",
      effectiveFrom: new Date("2026-01-01"),
      effectiveTo: new Date("2026-12-31"),
    },
  });

  // Add price list items for each part
  await Promise.all(
    parts.map((part) =>
      prisma.priceListItem.create({
        data: {
          priceListId: priceList.id,
          partId: part.id,
          partNumber: part.partNumber,
          unitPrice: Math.floor(Math.random() * 5000) + 100,
          discountPct: Math.random() > 0.7 ? 10 : 0,
          currency: "EGP",
        },
      })
    )
  );

  console.log(`✅ Created price list with ${parts.length} items`);

  // ──────────────────────────────────────────────────────────────────────
  // 5. CREATE ORDERS
  // ──────────────────────────────────────────────────────────────────────

  console.log("\n📋 Creating orders...");

  const dealers = [cairo, delta, alexandria];
  const statuses = [
    "submitted",
    "under_review",
    "approved",
    "done",
    "invoiced",
    "delivered",
  ];
  const orderTypes = ["daily", "air_dhl", "stock"];

  let orderCount = 0;

  for (let dealerIdx = 0; dealerIdx < dealers.length; dealerIdx++) {
    const dealer = dealers[dealerIdx];

    for (let i = 0; i < 10; i++) {
      const selectedParts = parts.slice(0, Math.floor(Math.random() * 4) + 1);
      const subtotal = selectedParts.reduce(
        (sum) => sum + (Math.floor(Math.random() * 5000) + 100),
        0
      );
      const vat = Math.floor(subtotal * 0.14);
      const total = subtotal + vat;

      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-2026-${String(1000 + orderCount).slice(-4)}`,
          dealerId: dealer.id,
          orderType: orderTypes[Math.floor(Math.random() * orderTypes.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          creditLimitAtOrder: dealer.creditLimit,
          overdueBalanceAtOrder: 0,
          subtotal: subtotal,
          vatAmount: vat,
          totalAmount: total,
          approvedAt:
            Math.random() > 0.5
              ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
              : null,
          invoiceNumber:
            Math.random() > 0.5
              ? `INV-2026-${String(100 + orderCount).slice(-3)}`
              : null,
          invoiceDate:
            Math.random() > 0.5
              ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
              : null,
          trackingNumber:
            Math.random() > 0.5
              ? `TRK-${String(Math.random()).slice(2, 10)}`
              : null,
          carrier: Math.random() > 0.5 ? "DHL" : "FedEx",
          etaCalculated: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(
            Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000
          ),
        },
      });

      // Add order lines
      for (const part of selectedParts) {
        await prisma.orderLine.create({
          data: {
            orderId: order.id,
            partNumber: part.partNumber,
            partName: part.nameEn,
            partNameAr: part.nameAr,
            quantityRequested: Math.floor(Math.random() * 20) + 1,
            quantityConfirmed: Math.floor(Math.random() * 20),
            unitPrice: Math.floor(Math.random() * 5000) + 100,
            lineTotal: Math.floor((Math.random() * 100000) / 2),
            lineStatus: Math.random() > 0.5 ? "confirmed" : "pending",
          },
        });
      }

      orderCount++;
    }
  }

  console.log(`✅ Created ${orderCount} orders with line items`);

  // ──────────────────────────────────────────────────────────────────────
  // 6. CREATE INQUIRIES & LOST SALES
  // ──────────────────────────────────────────────────────────────────────

  console.log("\n❓ Creating inquiries...");

  let inquiryCount = 0;
  let lostSaleCount = 0;

  for (const dealer of dealers) {
    for (let i = 0; i < 5; i++) {
      const part = parts[Math.floor(Math.random() * parts.length)];

      const inquiry = await prisma.inquiry.create({
        data: {
          dealerId: dealer.id,
          partNumber: part.partNumber,
          quantity: Math.floor(Math.random() * 10) + 1,
          inquiryType: "search",
          message: "Need this part urgently",
          status: Math.random() > 0.5 ? "open" : "replied",
        },
      });

      inquiryCount++;

      // Create lost sale if inquiry is older or availability was bad
      if (Math.random() > 0.5) {
        await prisma.lostSale.create({
          data: {
            inquiryId: inquiry.id,
            dealerId: dealer.id,
            partNumber: part.partNumber,
            quantity: inquiry.quantity,
            reason: ["out_of_stock", "no_eta", "partial_stock"][
              Math.floor(Math.random() * 3)
            ],
            estimatedValue: Math.floor(Math.random() * 10000) + 1000,
          },
        });

        lostSaleCount++;
      }
    }
  }

  console.log(`✅ Created ${inquiryCount} inquiries and ${lostSaleCount} lost sales`);

  // ──────────────────────────────────────────────────────────────────────
  // 7. SUMMARY
  // ──────────────────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DATABASE SEED COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📊 Created:");
  console.log(`   ✓ ${dealers.length} dealers`);
  console.log(`   ✓ ${parts.length} parts`);
  console.log(`   ✓ ${orderCount} orders with line items`);
  console.log(`   ✓ ${inquiryCount} inquiries`);
  console.log(`   ✓ ${lostSaleCount} lost sales`);
  console.log("\n🔐 Test Credentials:");
  console.log("   Dealer 1: cairo@motors.eg (dlr-cairo)");
  console.log("   Dealer 2: delta@parts.eg (dlr-delta)");
  console.log("   Dealer 3: alex@spare.eg (dlr-alex)");
  console.log("   Admin: admin@mansco.eg (super_admin)");
  console.log("\n💡 Note: These credentials need to be set up in Supabase Auth separately");
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
