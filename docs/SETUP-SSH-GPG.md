# SETUP SSH & GPG KEY — MULTI ACCOUNT GITHUB

Dokumentasi setup autentikasi GitHub menggunakan SSH Key di Windows (Git Bash).

---

## Konsep Dasar

| Metode | Fungsi |
|--------|--------|
| **SSH Key** | Autentikasi — biar bisa `push` / `pull` ke GitHub |
| **GPG Key** | Signing — biar commit ada tanda ✅ **Verified** di GitHub |

---

## Prasyarat

- Git Bash sudah terinstall
- Akses internet
- Akun GitHub aktif

---

## LANGKAH 1 — Generate SSH Key

Jalankan perintah berikut di Git Bash. Ganti email dan nama alias sesuai akun.

```bash
ssh-keygen -t ed25519 -C "emailkamu@gmail.com" -f ~/.ssh/github_namaakun
```

- `-t ed25519` → algoritma modern dan aman
- `-C` → label/komentar (biasanya email)
- `-f` → nama file key (simpan di `~/.ssh/`)

> **Passphrase** boleh dikosongkan — tekan Enter dua kali.

---

## LANGKAH 2 — Tampilkan Public Key

```bash
cat ~/.ssh/github_namaakun.pub
```

Copy seluruh output-nya.

---

## LANGKAH 3 — Tambahkan ke GitHub

1. Buka 👉 [https://github.com/settings/ssh/new](https://github.com/settings/ssh/new)
2. Pastikan login dengan akun yang sesuai
3. Isi form:
   - **Title** → nama pengenal (contoh: `DESKTOP-NamaPC`)
   - **Key type** → `Authentication Key`
   - **Key** → paste public key dari langkah 2
4. Klik **Add SSH key**

---

## LANGKAH 4 — Tambahkan ke `~/.ssh/config`

```bash
cat >> ~/.ssh/config << 'EOF'
Host github-namaakun
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_namaakun

EOF
```

> `Host github-namaakun` adalah alias yang akan dipakai saat clone/remote.

---

## LANGKAH 5 — Test Koneksi

```bash
ssh -T git@github-namaakun
```

Jika berhasil, output akan seperti ini:

```
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## Daftar Akun yang Sudah Di-setup

| No | Email | Username GitHub | Host Alias | SSH Key File |
|----|-------|-----------------|------------|--------------|
| 1 | shedshera@gmail.com | developer-fibidy-06 | `github-shedshera` | `~/.ssh/github_shedshera` |
| 2 | sharefeed91@gmail.com | developer-fibidy-07 | `github-sharefeed91` | `~/.ssh/github_sharefeed91` |

---

## Cara Pakai di Repository

Saat `clone` atau set `remote`, gunakan **Host alias** bukan `github.com`:

```bash
# Clone
git clone git@github-shedshera:username/nama-repo.git

# Atau tambah remote manual
git remote add origin git@github-shedshera:username/nama-repo.git
```

---

## Cek Konfigurasi SSH

```bash
# Lihat isi config
cat ~/.ssh/config

# Lihat semua key yang ada
ls ~/.ssh/
```

---

## Tambah Akun Baru (Template)

```bash
# 1. Generate key
ssh-keygen -t ed25519 -C "emailbaru@gmail.com" -f ~/.ssh/github_namabaru

# 2. Tampilkan public key
cat ~/.ssh/github_namabaru.pub

# 3. Tambah ke config
cat >> ~/.ssh/config << 'EOF'
Host github-namabaru
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_namabaru

EOF

# 4. Test
ssh -T git@github-namabaru
```

---

*Dibuat: April 2026 | Platform: Windows Git Bash (MINGW64)*