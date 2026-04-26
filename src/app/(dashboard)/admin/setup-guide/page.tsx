"use client";

import { useState, useEffect, useRef } from "react";

const STEPS = [
  { id: "tujuan", label: "Tujuan Panduan Ini" },
  { id: "sebelum-mulai", label: "Sebelum Mulai" },
  { id: "langkah-1", label: "1. Daftar Akun Tuya" },
  { id: "langkah-2", label: "2. Buat Cloud Project" },
  { id: "langkah-3", label: "3. Aktifkan API" },
  { id: "langkah-4", label: "4. Salin Kredensial" },
  { id: "langkah-5", label: "5. Pasang Kamera di Smart Life" },
  { id: "langkah-6", label: "6. Hubungkan ke Project" },
  { id: "langkah-7", label: "7. Salin Device ID" },
  { id: "selesai", label: "✓ Selesai" },
];

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
      <span className="text-xs font-mono text-slate-500 w-44 shrink-0">{label}</span>
      <span className="flex-1 font-mono text-sm text-slate-800 truncate">{value}</span>
      <button
        onClick={handleCopy}
        className="shrink-0 text-xs px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
      >
        {copied ? "✓ Disalin" : "Salin"}
      </button>
    </div>
  );
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
      <span className="text-lg shrink-0">⚠️</span>
      <div>{children}</div>
    </div>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
      <span className="text-lg shrink-0">💡</span>
      <div>{children}</div>
    </div>
  );
}

function CheckBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-900">
      <span className="text-lg shrink-0">✅</span>
      <div>{children}</div>
    </div>
  );
}

function StepSection({ id, number, title, children }: { id: string; number?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="flex items-start gap-4 mb-6">
        {number && (
          <div className="shrink-0 w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
            {number}
          </div>
        )}
        <h2 className="text-xl font-semibold text-slate-900 pt-1.5">{title}</h2>
      </div>
      <div className={`space-y-4 ${number ? "ml-14" : ""}`}>{children}</div>
    </section>
  );
}

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal list-outside ml-5 space-y-2 text-slate-700 text-sm leading-relaxed">{children}</ol>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 text-left font-semibold text-slate-700 border-b border-slate-200">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-slate-700 border-b border-slate-100">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TuyaSetupGuide() {
  const [activeStep, setActiveStep] = useState("tujuan");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topmost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveStep(topmost.target.id);
        }
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 }
    );

    STEPS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-900 text-sm">Panduan Setup Kamera — Daycare CCTV</span>
          <span className="ml-auto text-xs text-slate-400">Untuk pemilik daycare</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex gap-8 px-6 py-10">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <nav className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Isi Panduan</p>
            {STEPS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${activeStep === id
                  ? "bg-slate-900 text-white font-medium"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-16 text-sm leading-relaxed text-slate-700">

          {/* Tujuan */}
          <section id="tujuan" className="scroll-mt-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Panduan Setup Kamera Bardi</h1>
            <p className="text-slate-500 mb-8">Ikuti panduan ini dari awal sampai selesai. Estimasi waktu: <strong className="text-slate-700">30–45 menit.</strong></p>

            <div className="bg-slate-900 text-white rounded-xl p-6 space-y-4">
              <p className="font-semibold text-white">🎯 Tujuan panduan ini</p>
              <p className="text-slate-300 text-sm">Di akhir panduan ini, Anda akan memiliki <strong className="text-white">3 data</strong> yang perlu dikirimkan ke developer aplikasi:</p>
              <div className="space-y-2 pt-1">
                {[
                  { label: "Client ID", desc: "Identitas akun Tuya Anda" },
                  { label: "Client Secret", desc: "Kunci rahasia akun Tuya Anda" },
                  { label: "Device ID", desc: "Nomor unik tiap kamera Bardi (satu per kamera)" },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3">
                    <span className="font-mono text-sm text-emerald-400 w-32 shrink-0">{label}</span>
                    <span className="text-slate-300 text-xs">{desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-slate-400 text-xs pt-1">Anda <strong className="text-slate-200">tidak perlu</strong> memahami cara kerja teknisnya. Cukup ikuti langkah-langkah di bawah.</p>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Sebelum Mulai */}
          <StepSection id="sebelum-mulai" title="Sebelum Mulai — Baca Ini Dulu">
            <WarningBox>
              <strong>Akun Tuya Developer ≠ akun Bardi/Smart Life.</strong>
              <br />
              Anda akan membuat akun baru khusus untuk keperluan developer. Jangan gunakan email atau password yang sama dengan akun Bardi Anda.
            </WarningBox>

            <WarningBox>
              <strong>Kamera Bardi perlu dipasang ulang ke aplikasi Smart Life.</strong>
              <br />
              Tuya (perusahaan di balik Bardi) hanya mendukung integrasi melalui aplikasi <strong>Smart Life</strong> — bukan aplikasi Bardi langsung. Proses ini membutuhkan reset kamera fisik.
            </WarningBox>

            <WarningBox>
              <strong>Perhatikan wilayah (region) akun.</strong>
              <br />
              Wilayah akun Smart Life Anda harus cocok dengan pengaturan project Tuya. Jika berbeda, kamera tidak akan terdeteksi. Panduan ini akan membantu Anda mengecek hal ini di Langkah 2.
            </WarningBox>

            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-800 mb-3">Yang perlu disiapkan sebelum mulai:</p>
              <ul className="space-y-2 text-slate-700">
                {[
                  "Smartphone (Android atau iPhone)",
                  "Koneksi WiFi yang stabil",
                  "Kamera Bardi yang sudah terpasang secara fisik",
                  "Akses ke router WiFi (untuk mengetahui nama dan password WiFi)",
                  "Laptop atau komputer untuk membuka iot.tuya.com",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-slate-400">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </StepSection>

          <hr className="border-slate-100" />

          {/* Langkah 1 */}
          <StepSection id="langkah-1" number="1" title="Daftar Akun Tuya Developer">
            <p>Buka <a href="https://iot.tuya.com" target="_blank" className="text-blue-600 underline font-medium">iot.tuya.com</a> di laptop atau komputer Anda.</p>
            <Ol>
              <Li>Klik tombol <strong>Sign Up</strong> di pojok kanan atas.</Li>
              <Li>Masukkan alamat email dan buat password baru. <em>Gunakan email yang berbeda dari akun Bardi Anda.</em></Li>
              <Li>Cek kotak masuk email Anda, lalu klik tautan verifikasi yang dikirimkan Tuya.</Li>
              <Li>Saat diminta memilih <strong>Country/Region</strong>, pilih sesuai dengan wilayah yang Anda gunakan di aplikasi Bardi atau Smart Life (biasanya Indonesia).</Li>
            </Ol>
            <CheckBox>Anda berhasil masuk ke halaman utama Tuya IoT Platform.</CheckBox>
          </StepSection>

          <hr className="border-slate-100" />

          {/* Langkah 2 */}
          <StepSection id="langkah-2" number="2" title="Buat Cloud Project">
            <TipBox>
              <strong>Sebelum membuat project</strong>, cek dulu wilayah akun Smart Life Anda:
              <br />Buka aplikasi Smart Life → <strong>Me</strong> (tab paling kanan) → ⚙️ <strong>Setting</strong> → <strong>Account and Security</strong> → <strong>Region</strong>.
              <br />Catat wilayahnya, Anda akan membutuhkannya di langkah ini.
            </TipBox>

            <Ol>
              <Li>Di halaman Tuya, klik menu <strong>Cloud</strong> di sidebar kiri, lalu klik <strong>Development</strong>.</Li>
              <Li>Klik tombol <strong>Create Cloud Project</strong>.</Li>
              <Li>Isi formulir seperti berikut:</Li>
            </Ol>

            <Table
              headers={["Kolom", "Isi dengan"]}
              rows={[
                ["Project Name", "daycare-cctv (atau nama bebas)"],
                ["Industry", "Smart Home"],
                ["Development Method", "Smart Home"],
                ["Data Center", "Lihat tabel di bawah"],
              ]}
            />

            <p className="font-medium text-slate-800 mt-2">Pilih Data Center berdasarkan wilayah Smart Life Anda:</p>
            <Table
              headers={["Wilayah di Smart Life", "Pilih Data Center", "Catatan URL"]}
              rows={[
                ["Europe (termasuk sebagian Indonesia)", "Central Europe", "openapi.tuyaeu.com"],
                ["India", "India", "openapi.tuyain.com"],
                ["America", "Western America", "openapi.tuyaus.com"],
                ["China", "China", "openapi.tuyacn.com"],
              ]}
            />

            <WarningBox>
              <strong>Pastikan Data Center sesuai dengan wilayah Smart Life Anda.</strong> Jika salah pilih, kamera tidak akan terdeteksi dan tidak dapat diperbaiki tanpa membuat project baru.
            </WarningBox>

            <Ol>
              <Li>Klik <strong>Create</strong>.</Li>
            </Ol>
            <CheckBox>Project baru muncul di daftar Cloud Development.</CheckBox>
          </StepSection>

          <hr className="border-slate-100" />

          {/* Langkah 3 */}
          <StepSection id="langkah-3" number="3" title="Aktifkan Layanan API">
            <p>Setelah project dibuat, akan muncul jendela <strong>Authorize API Services</strong> secara otomatis. Jika tidak muncul, buka tab <strong>Service API</strong> di dalam project.</p>
            <p>Pastikan semua layanan berikut <strong>dicentang (✓)</strong>:</p>

            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {[
                { name: "Industry Basic Service", required: true },
                { name: "Smart Home Basic Service", required: true },
                { name: "Device Status Notification", required: true },
                { name: "IoT Video Live Stream", required: true, note: "Paling penting — tanpa ini video tidak akan bisa ditampilkan" },
                { name: "Authorization Token Management", required: true },
              ].map(({ name, note }) => (
                <div key={name} className="flex items-start gap-3 px-4 py-3 bg-white">
                  <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                  <div>
                    <span className="font-medium text-slate-800">{name}</span>
                    {note && <p className="text-xs text-slate-500 mt-0.5">{note}</p>}
                  </div>
                </div>
              ))}
            </div>

            <Ol>
              <Li>Klik tombol <strong>Authorize</strong>.</Li>
            </Ol>
            <CheckBox>Semua layanan di atas muncul di tab Service API dengan status "Subscribed".</CheckBox>
          </StepSection>

          <hr className="border-slate-100" />

          {/* Langkah 4 */}
          <StepSection id="langkah-4" number="4" title="Salin Client ID dan Client Secret">
            <p>Ini adalah dua dari tiga data yang perlu Anda kirimkan ke developer.</p>
            <Ol>
              <Li>Buka project yang baru dibuat.</Li>
              <Li>Klik tab <strong>Overview</strong>.</Li>
              <Li>Anda akan melihat dua nilai berikut. Salin masing-masing dan kirimkan ke developer:</Li>
            </Ol>

            <div className="space-y-2 my-4">
              <CopyBox label="TUYA_CLIENT_ID" value="← Salin nilai Access ID / Client ID dari halaman Overview" />
              <CopyBox label="TUYA_CLIENT_SECRET" value="← Salin nilai Access Secret / Client Secret dari halaman Overview" />
            </div>

            <WarningBox>
              <strong>Client Secret hanya ditampilkan satu kali.</strong> Jika Anda lupa menyalinnya, klik tombol <strong>Reset</strong> untuk membuat yang baru — tetapi nilai lama akan langsung tidak berlaku.
            </WarningBox>

            <TipBox>
              Kirimkan nilai ini ke developer melalui pesan pribadi atau email. Jangan bagikan secara publik (misalnya di grup WhatsApp umum).
            </TipBox>
          </StepSection>

          <hr className="border-slate-100" />

          {/* Langkah 5 */}
          <StepSection id="langkah-5" number="5" title="Pasang Kamera di Aplikasi Smart Life">
            <WarningBox>
              <strong>Kamera yang sebelumnya dipasang di aplikasi Bardi perlu dipasang ulang di Smart Life.</strong> Ini memerlukan reset fisik kamera. Proses ini tidak merusak kamera.
            </WarningBox>

            <p className="font-semibold text-slate-800">A. Install dan buat akun Smart Life</p>
            <Ol>
              <Li>Unduh aplikasi <strong>Smart Life</strong> dari Play Store (Android) atau App Store (iPhone).</Li>
              <Li>Buat akun baru atau login jika sudah punya. <strong>Pastikan wilayah (region) akun sama dengan Data Center yang dipilih di Langkah 2.</strong></Li>
            </Ol>

            <p className="font-semibold text-slate-800 mt-4">B. Reset kamera Bardi</p>
            <Ol>
              <Li>Pastikan kamera tersambung ke listrik.</Li>
              <Li>Tekan dan tahan tombol reset pada kamera selama <strong>5–10 detik</strong> hingga terdengar suara atau indikator LED berkedip.</Li>
              <Li>Lepaskan tombol. Kamera siap dipasang ulang.</Li>
            </Ol>

            <TipBox>
              Letak tombol reset biasanya di bagian bawah atau belakang kamera. Jika tidak ditemukan, cek buku panduan yang disertakan dalam kotak kamera.
            </TipBox>

            <p className="font-semibold text-slate-800 mt-4">C. Tambahkan kamera ke Smart Life</p>
            <Ol>
              <Li>Di aplikasi Smart Life, ketuk tombol <strong>+</strong> di pojok kanan atas.</Li>
              <Li>Pilih <strong>Add Device</strong> → <strong>Security & Video Surveillance</strong> → <strong>Smart Camera (Wi-Fi)</strong>.</Li>
              <Li>Ikuti panduan di layar. Biasanya kamera akan menampilkan QR code yang perlu di-scan oleh kamera Bardi.</Li>
              <Li>Masukkan nama dan password WiFi Anda saat diminta.</Li>
              <Li>Tunggu hingga status kamera berubah menjadi <strong>Online</strong>.</Li>
            </Ol>

            <CheckBox>
              Kamera Bardi muncul di aplikasi Smart Life dengan status <strong>Online</strong>.
              <br /><span className="text-xs mt-1 block">Coba buka live view di Smart Life dulu sebelum lanjut. Jika sudah bisa melihat video, lanjut ke Langkah 6.</span>
            </CheckBox>
          </StepSection>

          <hr className="border-slate-100" />

          {/* Langkah 6 */}
          <StepSection id="langkah-6" number="6" title="Hubungkan Smart Life ke Cloud Project">
            <p>Langkah ini menghubungkan kamera-kamera di akun Smart Life Anda dengan project Tuya yang sudah dibuat.</p>
            <Ol>
              <Li>Di website Tuya (<a href="https://iot.tuya.com" target="_blank" className="text-blue-600 underline">iot.tuya.com</a>), buka project Anda.</Li>
              <Li>Klik tab <strong>Devices</strong>.</Li>
              <Li>Klik tab <strong>Link Tuya App Account</strong>.</Li>
              <Li>Klik tombol <strong>Add App Account</strong>. Akan muncul QR code di layar komputer Anda.</Li>
              <Li>Di aplikasi Smart Life, buka tab <strong>Me</strong> (pojok kanan bawah).</Li>
              <Li>Ketuk ikon <strong>scan / QR</strong> di pojok kanan atas aplikasi Smart Life.</Li>
              <Li>Arahkan kamera smartphone ke QR code di layar komputer.</Li>
              <Li>Smart Life akan menampilkan konfirmasi → ketuk <strong>Confirm</strong>.</Li>
              <Li>Kembali ke browser, klik <strong>OK</strong> atau refresh halaman.</Li>
            </Ol>

            <WarningBox>
              Satu akun Smart Life dapat dihubungkan ke maksimal <strong>2 Cloud Project</strong>. Jika sudah penuh, hubungi developer untuk bantuan.
            </WarningBox>

            <CheckBox>
              Tab <strong>All Devices</strong> di project Tuya menampilkan kamera Bardi Anda.
            </CheckBox>
          </StepSection>

          <hr className="border-slate-100" />

          {/* Langkah 7 */}
          <StepSection id="langkah-7" number="7" title="Salin Device ID Kamera">
            <p>Ini adalah data terakhir yang perlu dikirimkan ke developer. Setiap kamera memiliki Device ID yang berbeda.</p>
            <Ol>
              <Li>Di Tuya, buka project Anda → tab <strong>Devices</strong> → <strong>All Devices</strong>.</Li>
              <Li>Temukan kamera Bardi Anda di daftar.</Li>
              <Li>Salin nilai <strong>Device ID</strong> — berupa rangkaian huruf dan angka, contoh: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">6cf2b6d2b09a2f8597xxxx</code>.</Li>
              <Li>Jika Anda memiliki lebih dari satu kamera, salin Device ID masing-masing dan beri label nama ruangannya (misalnya: "Ruang Bayi", "Toddler").</Li>
            </Ol>

            <div className="space-y-2 my-4">
              <CopyBox label="DEVICE_ID — Kamera 1" value="← Salin Device ID kamera pertama dari tab All Devices" />
              <CopyBox label="DEVICE_ID — Kamera 2" value="← Salin Device ID kamera kedua (jika ada)" />
            </div>

            <WarningBox>
              Device ID hanya berisi huruf dan angka. Tidak ada tanda hubung (-), spasi, atau simbol lain. Jika ada, kemungkinan Anda menyalin bagian yang salah.
            </WarningBox>
          </StepSection>

          <hr className="border-slate-100" />

          {/* Selesai */}
          <section id="selesai" className="scroll-mt-8">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-emerald-900 mb-2">Selesai!</h2>
              <p className="text-emerald-800 text-sm mb-6">Anda telah berhasil menyelesaikan semua langkah setup. Kirimkan data berikut ke developer:</p>
              <div className="space-y-2 text-left">
                {[
                  { label: "TUYA_CLIENT_ID", desc: "Dari Langkah 4 — tab Overview project" },
                  { label: "TUYA_CLIENT_SECRET", desc: "Dari Langkah 4 — tab Overview project" },
                  { label: "DEVICE_ID (tiap kamera)", desc: "Dari Langkah 7 — tab All Devices" },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 border border-emerald-100">
                    <span className="font-mono text-sm font-semibold text-emerald-700 w-52 shrink-0">{label}</span>
                    <span className="text-slate-500 text-xs">{desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-emerald-700 text-xs mt-6">Jika ada kendala, hubungi developer dan sebutkan di langkah mana Anda mengalami masalah.</p>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}