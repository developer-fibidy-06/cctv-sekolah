// ============================================================
// DAYCARE CCTV — SEED USERS & ACCESS
// Jalankan: node scripts/seed.js
// Butuh: NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY di .env.local
//
// Idempotent — aman di-run berkali-kali. Tidak akan bikin duplicate.
// ============================================================
//
// Hasil setelah jalan:
//   - 1 super admin             → admin@daycare.com / Admin@2026
//   - 2 parent (wali murid)     → parent1@daycare.com, parent2@daycare.com / Parent@2026
//   - parent1 → akses ke 2 kamera mock (Ruang Bayi + Toddler)
//   - parent2 → akses ke 1 kamera mock (Ruang Bayi saja)
//
// Prasyarat:
//   - SQL setup.sql sudah dijalankan (mock cameras 'mockdevice001' & 'mockdevice002' sudah ada)
//   - .env.local sudah berisi Supabase keys yang valid
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// 📋 DATA SEED — GANTI SESUAI KEBUTUHAN
// ============================================================

const userList = [
  {
    full_name: "Super Administrator",
    email: "admin@daycare.com",
    password: "Admin@2026",
    role: "super_admin",
    phone: null,
  },
  {
    full_name: "Wali Murid 1 (Test)",
    email: "parent1@daycare.com",
    password: "Parent@2026",
    role: "parent",
    phone: "081234567891",
  },
  {
    full_name: "Wali Murid 2 (Test)",
    email: "parent2@daycare.com",
    password: "Parent@2026",
    role: "parent",
    phone: "081234567892",
  },
];

// Mapping email parent → list device_id yang dia bisa akses
// device_id harus persis match dengan tabel cameras (lihat SQL setup section 10)
const accessAssignments = {
  "parent1@daycare.com": ["mockdevice001", "mockdevice002"],
  "parent2@daycare.com": ["mockdevice001"],
};

// ============================================================
// 🚀 CREATE/SYNC USER
// ============================================================

async function upsertUser(userData) {
  try {
    console.log(`\n📝 Processing: ${userData.full_name} (${userData.email})`);

    // Cek apakah auth user sudah ada
    const {
      data: { users },
      error: listError,
    } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const existing = users.find((u) => u.email === userData.email);
    let userId;
    let status;

    if (existing) {
      console.log(`   ⏭️  Auth user sudah ada (ID: ${existing.id})`);
      userId = existing.id;
      status = "linked";
    } else {
      console.log(`   🔐 Membuat auth user...`);
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: { full_name: userData.full_name },
        });
      if (authError) throw authError;
      if (!authData.user) throw new Error("No user data returned");

      userId = authData.user.id;
      status = "created";
      console.log(`   ✅ Auth user dibuat: ${userId}`);

      // Tunggu trigger handle_new_user jalan (insert default profile)
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // Upsert profile dengan data lengkap (overwrite role, phone, dsb.)
    // Trigger handle_new_user default-nya set role='parent'.
    // Kita upsert biar role super_admin / data lain ke-update.
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          id: userId,
          full_name: userData.full_name,
          role: userData.role,
          email: userData.email,
          phone: userData.phone,
          is_active: true,
        },
        { onConflict: "id" }
      );

    if (profileError) throw profileError;
    console.log(`   ✅ Profile synced (role: ${userData.role})`);

    return { status, userId, ...userData };
  } catch (error) {
    console.error(`   ❌ ERROR: ${error.message}`);
    return { status: "failed", ...userData, error: error.message };
  }
}

// ============================================================
// 🎥 ASSIGN CAMERA ACCESS
// ============================================================

async function assignAccess(userResultMap) {
  console.log("\n\n=============================================");
  console.log("🎥 ASSIGN CAMERA ACCESS");
  console.log("=============================================");

  // Fetch semua cameras sekali — buat lookup device_id → camera.id (uuid)
  const { data: cameras, error: camError } = await supabase
    .from("cameras")
    .select("id, device_id, label");

  if (camError) {
    console.error(`   ❌ Gagal fetch cameras: ${camError.message}`);
    return;
  }

  if (!cameras || cameras.length === 0) {
    console.log(
      "\n   ⚠️  Tabel cameras kosong. Pastikan setup.sql sudah dijalankan"
    );
    console.log("       (mockdevice001 & mockdevice002 di-seed di section 10).");
    return;
  }

  const deviceIdToCameraId = new Map(cameras.map((c) => [c.device_id, c.id]));

  for (const [email, deviceIds] of Object.entries(accessAssignments)) {
    const user = userResultMap.get(email);
    if (!user || !user.userId) {
      console.log(`\n   ⏭️  Skip ${email} — user tidak ditemukan`);
      continue;
    }

    console.log(`\n👤 ${user.full_name} (${email})`);

    const cameraIds = deviceIds
      .map((did) => {
        const cid = deviceIdToCameraId.get(did);
        if (!cid) {
          console.log(`   ⚠️  Device "${did}" tidak ditemukan di tabel cameras — skip`);
        }
        return cid;
      })
      .filter(Boolean);

    if (cameraIds.length === 0) continue;

    // Upsert via insert + onConflict (parent_id, camera_id) — idempotent
    const rows = cameraIds.map((cameraId) => ({
      parent_id: user.userId,
      camera_id: cameraId,
    }));

    const { error: insertError } = await supabase
      .from("camera_access")
      .upsert(rows, {
        onConflict: "parent_id,camera_id",
        ignoreDuplicates: true,
      });

    if (insertError) {
      console.log(`   ❌ Gagal assign: ${insertError.message}`);
      continue;
    }

    deviceIds.forEach((did) => {
      const cam = cameras.find((c) => c.device_id === did);
      if (cam) console.log(`   ✅ Granted access → ${cam.label} (${did})`);
    });
  }
}

// ============================================================
// 🎬 MAIN
// ============================================================

async function main() {
  console.log("🚀 DAYCARE CCTV — SEED");
  console.log("=============================================");
  console.log(`📋 Total user: ${userList.length}\n`);

  const results = { created: [], linked: [], failed: [] };
  const userResultMap = new Map();

  for (const user of userList) {
    const result = await upsertUser(user);
    if (result.status && results[result.status]) {
      results[result.status].push(result);
    }
    if (result.userId) userResultMap.set(result.email, result);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  await assignAccess(userResultMap);

  // ===== SUMMARY =====
  console.log("\n\n=============================================");
  console.log("📊 RINGKASAN");
  console.log("=============================================\n");
  console.log(`✅ Created : ${results.created.length}`);
  results.created.forEach((r) =>
    console.log(`   ✅ ${r.full_name} (${r.email}) — ${r.role}`)
  );
  console.log(`\n🔗 Linked  : ${results.linked.length} (sudah ada sebelumnya)`);
  results.linked.forEach((r) =>
    console.log(`   🔗 ${r.full_name} (${r.email})`)
  );
  console.log(`\n❌ Failed  : ${results.failed.length}`);
  results.failed.forEach((r) =>
    console.log(`   ❌ ${r.full_name} (${r.email}): ${r.error}`)
  );

  // ===== CREDENTIALS =====
  console.log("\n\n=============================================");
  console.log("🔑 LOGIN CREDENTIALS");
  console.log("=============================================\n");
  userList.forEach((u) => {
    console.log(`👤 ${u.full_name} (${u.role})`);
    console.log(`   Email    : ${u.email}`);
    console.log(`   Password : ${u.password}`);
    if (u.role === "parent") {
      const devices = accessAssignments[u.email] ?? [];
      console.log(`   Akses    : ${devices.length} kamera (${devices.join(", ")})`);
    }
    console.log();
  });
  console.log("⚠️  Ini credentials TEST — ganti password sebelum production!\n");

  console.log("=============================================");
  console.log("🚀 NEXT STEPS");
  console.log("=============================================\n");
  console.log("1. Pastikan DEV_MOCK_STREAM=true di .env.local");
  console.log("2. Run: npm run dev");
  console.log("3. Login admin → /dashboard (manage cameras/parents/access)");
  console.log("4. Login parent1 → /watch → harus muncul 2 stream mock");
  console.log("5. Login parent2 → /watch → harus muncul 1 stream mock");
  console.log();
}

main()
  .then(() => {
    console.log("✅ Seed selesai!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed gagal:", error);
    process.exit(1);
  });