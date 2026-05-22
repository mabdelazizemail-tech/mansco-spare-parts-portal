import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const seedData = {
  dealers: [
    {
      code: "dlr-cairo",
      email: "cairo@motors.eg",
      company_name: "Cairo Motors",
      contact_person: "Ahmed Hassan",
      phone: "+201001234567",
      tax_id: "TAX001",
      branch_address: "Cairo, Egypt",
      dealer_type: "dealer",
      credit_limit: 50000,
      overdue_balance: 0,
      financial_status: "active",
      registration_status: "approved",
      is_active: true,
    },
    {
      code: "dlr-delta",
      email: "delta@parts.eg",
      company_name: "Delta Auto Parts",
      contact_person: "Mohamed Saleh",
      phone: "+201001234568",
      tax_id: "TAX002",
      branch_address: "Giza, Egypt",
      dealer_type: "dealer",
      credit_limit: 50000,
      overdue_balance: 0,
      financial_status: "active",
      registration_status: "approved",
      is_active: true,
    },
    {
      code: "dlr-alex",
      email: "alex@spare.eg",
      company_name: "Alexandria Spare Parts",
      contact_person: "Fatima Ahmad",
      phone: "+201001234569",
      tax_id: "TAX003",
      branch_address: "Alexandria, Egypt",
      dealer_type: "dealer",
      credit_limit: 50000,
      overdue_balance: 0,
      financial_status: "active",
      registration_status: "approved",
      is_active: true,
    },
  ],

  parts: [
    { part_number: "PE-001", name_en: "Timing Belt", name_ar: "حزام التوقيت", category_id: "ENGINE", model: "206", oem: "PE-206-TB" },
    { part_number: "PE-002", name_en: "Oil Filter", name_ar: "فلتر الزيت", category_id: "ENGINE", model: "206", oem: "PE-206-OF" },
    { part_number: "BR-001", name_en: "Brake Pads", name_ar: "وسائط الفرامل", category_id: "BRAKES", model: "206", oem: "BR-206-BP" },
    { part_number: "BR-002", name_en: "Brake Disc", name_ar: "قرص الفرامل", category_id: "BRAKES", model: "206", oem: "BR-206-BD" },
    { part_number: "SU-001", name_en: "Suspension Spring", name_ar: "نوابض التعليق", category_id: "SUSPENSION", model: "206", oem: "SU-206-SS" },
    { part_number: "EL-001", name_en: "Alternator", name_ar: "المولد", category_id: "ELECTRICAL", model: "206", oem: "EL-206-ALT" },
    { part_number: "EL-002", name_en: "Starter Motor", name_ar: "محرك البدء", category_id: "ELECTRICAL", model: "206", oem: "EL-206-SM" },
    { part_number: "GE-001", name_en: "Gasket", name_ar: "جوان", category_id: "GENERAL", model: "206", oem: "GE-206-GSK" },
    { part_number: "GE-002", name_en: "Spark Plug", name_ar: "شمعة الإشعال", category_id: "GENERAL", model: "206", oem: "GE-206-SP" },
    { part_number: "GE-003", name_en: "Battery", name_ar: "بطارية", category_id: "GENERAL", model: "206", oem: "GE-206-BAT" },
  ],
};

async function seed() {
  try {
    console.log("🌱 Starting Supabase seed...\n");

    // Map emails to their auth user IDs (created in earlier runs)
    const authUserIdMap: Record<string, string> = {
      "cairo@motors.eg": "0e44b58e-cf02-4126-9fc0-59da21ecc475",
      "delta@parts.eg": "192c9bd4-6028-48a1-93b5-1ef452b518ff",
      "alex@spare.eg": "1a1cb316-308f-44ec-9ca8-5c7ce497fe23",
    };

    const dealerUsers = Object.entries(authUserIdMap).map(([email, id]) => ({
      email,
      id,
    }));

    console.log("👤 Using pre-created Supabase Auth users:");
    dealerUsers.forEach(({ email, id }) => {
      console.log(`   ✓ ${email} (${id})`);
    });
    console.log(`✅ Auth users ready\n`);

    // Clear existing dealers (using code field to identify test dealers)
    console.log("Clearing existing test dealers...");
    for (const code of ["dlr-cairo", "dlr-delta", "dlr-alex"]) {
      await supabase.from("dealers").delete().eq("code", code);
    }

    // Update dealers with actual supabase_uids from auth
    const dealersWithAuthIds = seedData.dealers.map((dealer) => {
      const authUser = dealerUsers.find((u) => u.email === dealer.email);
      return {
        ...dealer,
        supabase_uid: authUser?.id || dealer.supabase_uid,
      };
    });

    // Insert dealers
    console.log("📍 Creating dealers...");
    const { error: dealerError } = await supabase.from("dealers").insert(dealersWithAuthIds);
    if (dealerError) {
      console.error("❌ Error creating dealers:", dealerError);
      return;
    }
    console.log(`✅ Created ${dealersWithAuthIds.length} dealers`);

    // Clear existing test parts
    console.log("Clearing existing test parts...");
    const testPartNumbers = seedData.parts.map((p) => p.part_number);
    for (const partNumber of testPartNumbers) {
      await supabase.from("parts_catalog").delete().eq("part_number", partNumber);
    }

    // Insert parts
    console.log("📦 Creating parts...");
    const { error: partsError } = await supabase.from("parts_catalog").insert(
      seedData.parts.map((p) => ({
        part_number: p.part_number,
        name_en: p.name_en,
        name_ar: p.name_ar,
        category_id: p.category_id,
        model: p.model,
        oem: p.oem,
      }))
    );
    if (partsError) {
      console.error("❌ Error creating parts:", partsError);
      return;
    }
    console.log(`✅ Created ${seedData.parts.length} parts`);

    // Get all parts for stock availability
    const { data: parts, error: partsSelectError } = await supabase.from("parts_catalog").select("part_number");
    if (partsSelectError || !parts) {
      console.error("❌ Error fetching parts:", partsSelectError);
      return;
    }

    // Create stock availability for each part
    console.log("📊 Creating stock availability...");
    const stockRecords = parts.map((part) => ({
      part_number: part.part_number,
      quantity_available: Math.floor(Math.random() * 100) + 10,
      quantity_atp: Math.floor(Math.random() * 100) + 10,
      source_location: "Cairo Warehouse",
      replenishment_eta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    }));

    const { error: stockError } = await supabase.from("stock_availability").insert(stockRecords);
    if (stockError) {
      console.error("❌ Error creating stock availability:", stockError);
      return;
    }
    console.log(`✅ Created stock records for all parts`);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 DATABASE SEED COMPLETE!");
    console.log("=".repeat(60));
    console.log("\n📊 Created:");
    console.log(`   ✓ ${seedData.dealers.length} dealers`);
    console.log(`   ✓ ${seedData.parts.length} parts`);
    console.log(`   ✓ ${parts.length} stock availability records`);
    console.log("\n🔐 Test Dealer Accounts:");
    console.log("   Dealer 1: cairo@motors.eg (code: dlr-cairo)");
    console.log("   Dealer 2: delta@parts.eg (code: dlr-delta)");
    console.log("   Dealer 3: alex@spare.eg (code: dlr-alex)");
    console.log("\n💡 Note: Create these accounts in Supabase Auth manually with same emails");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
