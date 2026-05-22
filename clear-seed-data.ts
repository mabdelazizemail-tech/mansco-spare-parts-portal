import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function clear() {
  try {
    console.log("Clearing all test seed data...\n");
    
    // Delete dealers
    const { count: dealerCount } = await supabase
      .from("dealers")
      .delete()
      .in("code", ["dlr-cairo", "dlr-delta", "dlr-alex"]);
    console.log(`✓ Deleted ${dealerCount} dealers`);
    
    // Delete parts
    const { count: partCount } = await supabase
      .from("parts_catalog")
      .delete()
      .in("part_number", [
        "PE-001", "PE-002", "BR-001", "BR-002", "SU-001",
        "EL-001", "EL-002", "GE-001", "GE-002", "GE-003"
      ]);
    console.log(`✓ Deleted ${partCount} parts`);
    
    console.log("\nData cleared. You can now run seed-supabase.ts");
  } catch (error) {
    console.error("Error:", error);
  }
}

clear();
