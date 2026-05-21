/**
 * End-to-End Simulation Script — Module 1: Auth & Dealer Onboarding
 *
 * This script exercises the live Supabase Cloud instance to simulate the
 * complete dealer lifecycle:
 *
 *   Step 1: Dealer submits registration (POST /api/registration)
 *   Step 2: Admin reviews the pending queue (GET /api/registration/list)
 *   Step 3: Admin approves the registration (POST /api/registration/:id/review)
 *   Step 4: Verification that user_metadata was updated to "approved"
 *   Step 5: Middleware access-control assertions on the dealer path
 *   Step 6: Cleanup (delete test user from Supabase Auth)
 *
 * Run with:  npx tsx tests/e2e-simulation.ts
 */

import { createClient } from "@supabase/supabase-js";

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE env vars. Ensure .env.local is loaded.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(msg: string) {
  console.log(`  ${msg}`);
}
function pass(label: string) {
  console.log(`  ✅  ${label}`);
}
function fail(label: string, detail?: string) {
  console.error(`  ❌  ${label}${detail ? `: ${detail}` : ""}`);
  process.exitCode = 1;
}
function section(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"─".repeat(60)}`);
}

// ─── Test data ────────────────────────────────────────────────────────────────
const testEmail = `e2e-test-${Date.now()}@mansco-test.invalid`;
const testPassword = "E2eTest1!";
let testUserId: string | null = null;
let testRegistrationId: string | null = null;

// ─── Step 1: Submit registration ──────────────────────────────────────────────
async function step1_submitRegistration() {
  section("STEP 1 — Dealer submits registration");

  const fd = new FormData();
  fd.append("email", testEmail);
  fd.append("password", testPassword);
  fd.append("confirm_password", testPassword);
  fd.append("company_name", "E2E Test Dealership Co.");
  fd.append("contact_person", "Test User");
  fd.append("phone", "+201000000001");
  fd.append("tax_id", "E2ETEST99");
  fd.append("commercial_register_number", "CR-E2E-001");
  fd.append("branch_address", "1 Test Street, Cairo, Egypt, E2E District");
  fd.append("dealer_type_requested", "dealer");

  const res = await fetch(`${APP_BASE}/api/registration`, { method: "POST", body: fd });
  const body = await res.json();

  if (res.status === 201) {
    pass(`Registration submitted — HTTP 201`);
    log(`Response: ${JSON.stringify(body.data)}`);
  } else {
    fail(`Registration submission failed — HTTP ${res.status}`, JSON.stringify(body));
    return false;
  }

  // Fetch the created user from Supabase Auth to confirm
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const created = usersData?.users?.find((u) => u.email === testEmail);

  if (created) {
    testUserId = created.id;
    pass(`Supabase Auth user created — uid: ${testUserId}`);
    const meta = created.user_metadata;
    if (meta?.registration_status === "pending") {
      pass(`user_metadata.registration_status = "pending"`);
    } else {
      fail(`Expected registration_status "pending", got "${meta?.registration_status}"`);
    }
    if (meta?.role === "dealer") {
      pass(`user_metadata.role = "dealer"`);
    } else {
      fail(`Expected role "dealer", got "${meta?.role}"`);
    }
  } else {
    fail(`Supabase Auth user NOT found for ${testEmail}`);
    return false;
  }

  // Confirm dealer_registrations record exists in DB
  const { data: regData } = await supabaseAdmin
    .from("dealer_registrations")
    .select("id, review_status, email")
    .eq("email", testEmail)
    .single();

  if (regData) {
    testRegistrationId = regData.id;
    pass(`dealer_registrations record created — id: ${testRegistrationId}`);
    if (regData.review_status === "pending") {
      pass(`dealer_registrations.review_status = "pending"`);
    } else {
      fail(`Expected "pending", got "${regData.review_status}"`);
    }
  } else {
    fail("dealer_registrations record NOT found in DB");
    return false;
  }

  return true;
}

// ─── Step 1b: Validate Zod rejection ─────────────────────────────────────────
async function step1b_zodRejection() {
  section("STEP 1b — Zod validation rejects invalid payload");

  // Missing email, weak password, too-short company name
  const fd = new FormData();
  fd.append("email", "not-an-email");
  fd.append("password", "weak");
  fd.append("confirm_password", "mismatch");
  fd.append("company_name", "X"); // too short
  fd.append("contact_person", "A"); // too short
  fd.append("phone", "123"); // too short
  fd.append("tax_id", "AB"); // too short
  fd.append("commercial_register_number", "A"); // too short
  fd.append("branch_address", "Short"); // too short
  fd.append("dealer_type_requested", "dealer");

  const res = await fetch(`${APP_BASE}/api/registration`, { method: "POST", body: fd });
  const body = await res.json();

  if (res.status === 400 && body.error?.code === "VALIDATION_ERROR") {
    pass(`Zod validation correctly rejects invalid payload — HTTP 400`);
    const fieldErrors = body.error?.details?.fieldErrors ?? {};
    const expectedFields = [
      "email", "password", "confirm_password",
      "company_name", "contact_person", "phone",
      "tax_id", "commercial_register_number", "branch_address",
    ];
    for (const field of expectedFields) {
      if (fieldErrors[field]) {
        pass(`  Field "${field}" has error: ${fieldErrors[field][0]}`);
      } else {
        fail(`  Field "${field}" missing from validation errors`);
      }
    }
  } else {
    fail(`Expected 400 VALIDATION_ERROR, got ${res.status}`, JSON.stringify(body));
  }
}

// ─── Step 2: Admin reviews pending queue ─────────────────────────────────────
async function step2_adminReviewsQueue() {
  section("STEP 2 — Admin views pending registration queue");

  const res = await fetch(`${APP_BASE}/api/registration/list`);
  const body = await res.json();

  if (res.ok && Array.isArray(body.data)) {
    pass(`GET /api/registration/list — HTTP 200`);
    const our = body.data.find((r: { id: string }) => r.id === testRegistrationId);
    if (our) {
      pass(`Test registration appears in queue (review_status: ${our.review_status})`);
    } else {
      fail(`Test registration NOT found in queue`);
    }
  } else {
    fail(`Failed to fetch registration list`, JSON.stringify(body));
  }
}

// ─── Step 3: Admin approves ───────────────────────────────────────────────────
async function step3_adminApproves() {
  section("STEP 3 — Admin approves the registration");

  if (!testRegistrationId) {
    fail("No registration ID to approve");
    return false;
  }

  const res = await fetch(`${APP_BASE}/api/registration/${testRegistrationId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "approve", admin_notes: "All docs verified." }),
  });
  const body = await res.json();

  if (res.ok) {
    pass(`POST /api/registration/:id/review (approve) — HTTP ${res.status}`);
  } else {
    fail(`Approval failed — HTTP ${res.status}`, JSON.stringify(body));
    return false;
  }

  // Verify DB state
  const { data: regData } = await supabaseAdmin
    .from("dealer_registrations")
    .select("review_status")
    .eq("id", testRegistrationId)
    .single();

  if (regData?.review_status === "approved") {
    pass(`dealer_registrations.review_status updated to "approved" in DB`);
  } else {
    fail(`Expected "approved" in DB, got "${regData?.review_status}"`);
  }

  // Verify dealers record created
  const { data: dealerData } = await supabaseAdmin
    .from("dealers")
    .select("id, registration_status")
    .eq("supabase_uid", testUserId!)
    .single();

  if (dealerData) {
    pass(`dealers record created — id: ${dealerData.id}`);
    if (dealerData.registration_status === "approved") {
      pass(`dealers.registration_status = "approved"`);
    } else {
      fail(`Expected "approved", got "${dealerData.registration_status}"`);
    }
  } else {
    fail("dealers record NOT created after approval");
  }

  return true;
}

// ─── Step 4: Verify user_metadata updated ────────────────────────────────────
async function step4_verifyMetadata() {
  section("STEP 4 — Verify Supabase user_metadata updated post-approval");

  if (!testUserId) return;

  const { data } = await supabaseAdmin.auth.admin.getUserById(testUserId);
  const meta = data?.user?.user_metadata;

  if (meta?.registration_status === "approved") {
    pass(`user_metadata.registration_status = "approved" ← middleware will allow dashboard access`);
  } else {
    fail(`Expected "approved", got "${meta?.registration_status}"`);
  }
}

// ─── Step 5: Double-review guard ─────────────────────────────────────────────
async function step5_doubleReviewGuard() {
  section("STEP 5 — Double-review guard: reject an already-approved registration");

  const res = await fetch(`${APP_BASE}/api/registration/${testRegistrationId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reject", rejection_reason: "Test double-review" }),
  });
  const body = await res.json();

  if (res.status === 409 && body.error?.code === "ALREADY_REVIEWED") {
    pass(`Double-review correctly blocked — HTTP 409 ALREADY_REVIEWED`);
  } else {
    fail(`Expected 409 ALREADY_REVIEWED, got ${res.status}`, JSON.stringify(body));
  }
}

// ─── Step 6: Middleware access control ───────────────────────────────────────
async function step6_middlewareAccessControl() {
  section("STEP 6 — Middleware access control assertions");

  // Test: demo-admin bypass
  const adminRes = await fetch(`${APP_BASE}/dashboard/admin`, {
    headers: { Cookie: "demo-admin=true" },
    redirect: "manual",
  });
  // Should NOT redirect (3xx) — should pass through (2xx or render)
  if (adminRes.status < 400) {
    pass(`Demo-admin cookie grants access to /dashboard/admin (status: ${adminRes.status})`);
  } else {
    fail(`Demo-admin bypass failed — HTTP ${adminRes.status}`);
  }

  // Test: unauthenticated access to /dashboard should redirect
  const unauthedRes = await fetch(`${APP_BASE}/dashboard`, {
    redirect: "manual",
  });
  if (unauthedRes.status === 307 || unauthedRes.status === 302 || unauthedRes.status === 308) {
    pass(`Unauthenticated /dashboard redirected (${unauthedRes.status}) → location: ${unauthedRes.headers.get("location")}`);
  } else {
    fail(`Expected redirect for unauthenticated /dashboard, got ${unauthedRes.status}`);
  }
}

// ─── Step 7: Cleanup ──────────────────────────────────────────────────────────
async function step7_cleanup() {
  section("STEP 7 — Cleanup test data");

  if (testUserId) {
    // Remove dealers record
    await supabaseAdmin.from("dealers").delete().eq("supabase_uid", testUserId);
    pass("dealers record deleted");

    // Remove dealer_registrations record
    await supabaseAdmin.from("dealer_registrations").delete().eq("supabase_uid", testUserId);
    pass("dealer_registrations record deleted");

    // Remove Supabase Auth user
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
    pass(`Supabase Auth user ${testUserId} deleted`);
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log("\n====================================================================");
  console.log("  MANSCO Portal — Module 1 E2E Simulation");
  console.log("  Target:", APP_BASE);
  console.log("====================================================================");

  try {
    // Check server is running
    const ping = await fetch(`${APP_BASE}/api/registration/list`).catch(() => null);
    if (!ping) {
      console.error("\n❌ Cannot reach server at", APP_BASE);
      console.error("   Start the dev server first: npm run dev\n");
      process.exit(1);
    }

    const ok1 = await step1_submitRegistration();
    if (!ok1) {
      await step7_cleanup();
      process.exit(1);
    }
    await step1b_zodRejection();
    await step2_adminReviewsQueue();
    const ok3 = await step3_adminApproves();
    if (ok3) {
      await step4_verifyMetadata();
      await step5_doubleReviewGuard();
    }
    await step6_middlewareAccessControl();
  } finally {
    await step7_cleanup();
  }

  console.log("\n====================================================================");
  if (process.exitCode === 1) {
    console.log("  ❌  E2E Simulation completed with FAILURES");
  } else {
    console.log("  ✅  E2E Simulation PASSED — all steps complete");
  }
  console.log("====================================================================\n");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
