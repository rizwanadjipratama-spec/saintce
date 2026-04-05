# Saintce — Gambaran Project

## Ini project apa?

Saintce adalah **website company profile premium** sekaligus **sistem kontrol internal lengkap** untuk bisnis modern. Jadi bukan cuma website biasa — di baliknya ada panel admin penuh untuk kelola klien, konten, tagihan, dan langganan layanan, plus **portal khusus klien** untuk bayar tagihan dan lihat status layanan mereka.

Desainnya menggunakan gaya **skeuomorphic** (panel berlapis, efek kaca, cahaya interaktif) yang terasa premium dan berbeda dari website biasa.

---

## Siapa yang bisa akses?

### Pengunjung umum (tanpa login)
Bisa langsung buka website dan melihat:
- **Halaman utama** — profil brand, proses kerja, dan ajakan kontak
- **Halaman Clients** — daftar klien live yang bisa dicari real-time
- **Halaman Contact** — form untuk kirim inquiry langsung ke email

### Klien (login via magic link email)
Klien yang sudah didaftarkan admin bisa masuk ke **portal khusus klien** dan melihat semua data mereka sendiri — tanpa bisa lihat data klien lain.

### Admin (harus login)
Login pakai akun GitHub yang sudah didaftarkan sebagai admin. Setelah masuk, bisa akses panel kontrol penuh.

---

## Fitur untuk pengunjung

| Fitur | Keterangan |
|-------|-----------|
| Landing page | Menampilkan hero, tagline, proses kerja, dan CTA |
| Client registry | Daftar klien dengan status (live, beta, private, archived) + fitur pencarian |
| Contact form | Form inquiry yang langsung dikirim ke email via Resend |

---

## Portal Klien

Setiap klien mendapat akses ke portal pribadi mereka di `/portal`. Login cukup pakai **email** — sistem kirim magic link, tidak perlu buat akun atau ingat password.

### Cara klien masuk:
```
1. Buka /portal/login
2. Masukkan email yang terdaftar
3. Cek email → klik link login
4. Masuk otomatis ke dashboard
```

### Yang bisa dilakukan klien di portal:

| Fitur | Keterangan |
|-------|-----------|
| Dashboard | Ringkasan: total invoice, tagihan tertunggak, subscription aktif |
| Project | Lihat semua project dan status layanan di dalamnya |
| Subscription | Lihat status langganan, harga, dan tanggal tagihan berikutnya |
| Invoice | Lihat semua tagihan, status, dan jumlah |
| Bayar invoice | Klik tombol Pay → redirect ke Stripe Checkout → bayar langsung |
| Download / Print PDF | Cetak atau simpan invoice sebagai PDF langsung dari browser |
| Stripe Billing Portal | Kelola metode pembayaran via Stripe |

> **Keamanan:** Setiap klien hanya bisa melihat data mereka sendiri. Sistem memverifikasi kepemilikan data di level database (RLS), bukan hanya di tampilan.

---

## Fitur admin (panel internal)

### Manajemen Konten (CMS)
Admin bisa edit seluruh teks di website tanpa menyentuh kode:
- Teks hero, tagline, deskripsi
- Section About, Process, CTA
- Footer

### Manajemen Klien
- Tambah, edit, hapus klien (soft delete — data tidak langsung hilang)
- Atur status klien: **live**, **beta**, **private**, atau **archived**
- Lihat statistik total klien

### Billing & Subscription
Sistem tagihan lengkap untuk kelola hubungan komersial dengan klien:
- Buat **project** per klien (dengan catatan internal)
- Daftarkan **layanan/service** per project
- Buat **subscription** (langganan) untuk layanan recurring
- Generate **invoice** manual atau otomatis
- Catat **pembayaran**
- Kirim notifikasi invoice ke email klien otomatis

### Integrasi Stripe
- Buat link pembayaran Stripe dari invoice (one-time)
- Setup recurring payment untuk subscription
- Klien bisa buka Stripe Billing Portal untuk kelola kartu mereka
- Webhook Stripe real-time: pembayaran masuk langsung sync ke sistem

### Billing Automation
Sistem billing berjalan **otomatis setiap hari** (01:00 UTC via cron). Admin juga bisa trigger manual dari dashboard:
- Generate invoice yang sudah jatuh tempo
- Tandai invoice overdue
- Suspend subscription yang belum bayar (dan kirim email notifikasi)
- Kirim reminder email ke klien

### Email Notifikasi Otomatis

Sistem kirim email otomatis ke klien untuk:

| Event | Keterangan |
|-------|-----------|
| Invoice terbit | Invoice baru dikirim ke email klien |
| Reminder | Pengingat invoice yang belum dibayar |
| Pembayaran berhasil | Konfirmasi setelah transaksi sukses |
| Pembayaran gagal | Notifikasi jika pembayaran ditolak |
| Subscription suspended | Peringatan jika layanan di-suspend |
| Subscription aktif kembali | Konfirmasi ketika layanan diaktifkan lagi |

### Billing Overview Dashboard

Dashboard admin untuk monitoring bisnis secara real-time:

| Metrik | Keterangan |
|--------|-----------|
| MRR | Monthly Recurring Revenue (langganan bulanan + tahunan/12) |
| Revenue bulan ini | Total pembayaran bulan berjalan |
| Subscription aktif | Jumlah langganan yang sedang aktif |
| Invoice overdue | Jumlah tagihan yang melewati jatuh tempo |
| Layanan suspended | Jumlah layanan yang sedang diblokir |
| Total klien | Jumlah klien aktif |
| Total project | Jumlah project aktif |
| Stripe webhook failures | Jumlah event webhook yang gagal diproses |

### Stripe Webhook Dashboard
Admin bisa monitor semua event Stripe yang masuk: status processing, error, dan history.

### Automation Run Log
Setiap kali billing automation berjalan (otomatis atau manual), hasilnya dicatat:
- Berapa invoice yang digenerate, overdue, dan subscription yang di-suspend
- Berapa notifikasi yang terkirim
- Durasi proses
- Error jika ada

### Export Data
Admin bisa download data sebagai file CSV:
- **Export Clients** — semua data klien aktif
- **Export Invoices** — semua data invoice

---

## Alur kerja admin (contoh)

```
1. Admin tambah klien baru (nama, email, perusahaan)
2. Admin buat project untuk klien tersebut
3. Admin daftarkan layanan ke project (misal: "Web Development")
4. Admin buat subscription untuk layanan itu
5. Sistem otomatis generate invoice setiap bulan
6. Klien terima email tagihan
7. Klien masuk ke portal → klik Pay
8. Redirect ke Stripe → bayar
9. Sistem otomatis update status: paid, subscription aktif, akses terbuka
10. Klien terima email konfirmasi pembayaran
```

---

## Keamanan

- Setiap klien hanya bisa lihat data mereka sendiri (database-level, bukan cuma tampilan)
- Admin terpisah sepenuhnya dari portal klien
- Webhook Stripe diverifikasi signature sebelum diproses
- Event duplikat Stripe diabaikan secara aman (idempotent)
- Semua aksi billing penting dicatat di audit log
- Data yang dihapus tidak langsung hilang (soft delete)

---

## Teknologi yang dipakai

Ini buat referensi teknis kalau dibutuhkan:

- **Next.js 16** — framework website (React)
- **Supabase** — database + auth + real-time
- **Stripe** — payment gateway
- **Resend** — kirim email
- **Framer Motion + Lenis** — animasi smooth

---

## Desain

- Tema gelap premium (warna utama: hitam pekat, putih krem, aksen emas)
- Panel berlapis dengan efek blur/kaca
- Tipografi display besar, spacing lega
- Efek cahaya yang mengikuti gerakan mouse
- Animasi smooth saat scroll dan pindah halaman
- Responsif di semua ukuran layar dan browser

---

## Ringkasan satu kalimat

> Saintce adalah platform SaaS premium untuk mengelola klien, project, layanan berlangganan, dan pembayaran — dengan website publik, admin panel lengkap, portal klien, dan billing automation yang berjalan sendiri setiap hari.
