// ============================================================
// E-RAPORT PKBM - SEED USERS
// Jalankan: node scripts/seed.js
// Butuh: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// 📋 DATA USER — GANTI SESUAI KEBUTUHAN
// ============================================================
const userList = [
  {
    full_name: "Administrator",
    email: "admin@pkbm.com",
    password: "Admin@2026",
    role: "super_admin",
  },
  {
    full_name: "Nama User",
    email: "user@pkbm.com",
    password: "User@2026",
    role: "user",
  },
];

// ============================================================
// 🚀 FUNGSI CREATE USER
// ============================================================
async function createUser(userData) {
  try {
    console.log(`\n📝 Processing: ${userData.full_name} (${userData.email})`);

    // Cek apakah sudah ada di auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const existing = users.find((u) => u.email === userData.email);

    if (existing) {
      console.log(`   ⏭️  Auth user sudah ada (ID: ${existing.id})`);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id, role")
        .eq("id", existing.id)
        .single();

      if (profile) {
        if (profile.role !== userData.role) {
          await supabase
            .from("user_profiles")
            .update({ role: userData.role, full_name: userData.full_name })
            .eq("id", existing.id);
          console.log(`   🔄 Role diupdate ke: ${userData.role}`);
        } else {
          console.log(`   ⏭️  Sudah ada di user_profiles, skip.`);
        }
        return { status: "skipped", ...userData };
      }

      // Belum ada profile — insert manual
      const { error: insertError } = await supabase
        .from("user_profiles")
        .insert({ id: existing.id, full_name: userData.full_name, role: userData.role });
      if (insertError) throw insertError;
      console.log(`   ✅ Profile dibuat untuk existing user`);
      return { status: "linked", ...userData };
    }

    // Buat auth user baru
    console.log(`   🔐 Membuat auth user...`);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: { full_name: userData.full_name },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("No user data returned");
    console.log(`   ✅ Auth user dibuat: ${authData.user.id}`);

    // Tunggu trigger handle_new_user jalan
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Update role kalau super_admin (trigger default-nya 'user')
    if (userData.role === "super_admin") {
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ role: "super_admin", full_name: userData.full_name })
        .eq("id", authData.user.id);
      if (updateError) throw updateError;
      console.log(`   👑 Role diset ke super_admin`);
    }

    console.log(`   ✅ DONE: ${userData.full_name}`);
    return { status: "created", ...userData, auth_id: authData.user.id };

  } catch (error) {
    console.error(`   ❌ ERROR: ${error.message}`);
    return { status: "failed", ...userData, error: error.message };
  }
}

// ============================================================
// 🎬 MAIN
// ============================================================
async function main() {
  console.log("🚀 SEED USERS - E-RAPORT PKBM");
  console.log("=============================================\n");
  console.log(`📋 Total user: ${userList.length}\n`);

  const results = { created: [], linked: [], skipped: [], failed: [] };

  for (const user of userList) {
    const result = await createUser(user);
    results[result.status]?.push(result);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n\n=============================================");
  console.log("📊 HASIL");
  console.log("=============================================\n");
  console.log(`✅ Created : ${results.created.length}`);
  results.created.forEach((r) => console.log(`   ✅ ${r.full_name} (${r.email}) — ${r.role}`));
  console.log(`\n🔗 Linked  : ${results.linked.length}`);
  results.linked.forEach((r) => console.log(`   🔗 ${r.full_name} (${r.email})`));
  console.log(`\n⏭️  Skipped : ${results.skipped.length}`);
  results.skipped.forEach((r) => console.log(`   ⏭️  ${r.full_name} (${r.email})`));
  console.log(`\n❌ Failed  : ${results.failed.length}`);
  results.failed.forEach((r) => console.log(`   ❌ ${r.full_name} (${r.email}): ${r.error}`));

  console.log("\n\n=============================================");
  console.log("🔑 LOGIN CREDENTIALS");
  console.log("=============================================\n");
  userList.forEach((u) => {
    console.log(`👤 ${u.full_name} (${u.role})`);
    console.log(`   Email    : ${u.email}`);
    console.log(`   Password : ${u.password}\n`);
  });
  console.log("⚠️  Ganti password setelah login pertama!\n");
}

main()
  .then(() => { console.log("✅ Script selesai!"); process.exit(0); })
  .catch((error) => { console.error("\n❌ Script gagal:", error); process.exit(1); });