# LoRa Channel Probing Dashboard (Next.js + Supabase)

Dashboard untuk memantau data dari program Python `channel_probing.py` pada dua Raspberry Pi. Dashboard membaca tabel `experiments` dan `rssi_samples` yang dibuat oleh paket channel-probing Supabase.

## Fitur
- Daftar dan pemilihan eksperimen (melalui chip pilihan dan daftar riwayat).
- Download CSV seluruh sampel untuk experiment yang sedang dipilih, dipasangkan berdasarkan sequence.
- Ringkasan jumlah sampel Alice/Bob dan rata-rata RSSI.
- Grafik RSSI Alice dan Bob berdasarkan sequence.
- Tabel 100 sampel terbaru pada tampilan dashboard.
- Refresh otomatis setiap 5 detik.
- Basic Auth untuk membatasi akses dashboard.
- Supabase secret key hanya dipakai di server Next.js, tidak dikirim ke browser.

## 1. Persiapan Supabase
Gunakan project Supabase yang sama dengan Raspberry Pi. Pastikan SQL dari paket `cosmic_channel_probing_supabase` sudah dijalankan di **SQL Editor**, sehingga tabel berikut tersedia:
- `experiments`
- `rssi_samples`
- `experiment_events`

Tidak perlu membuat policy SELECT publik karena dashboard mengambil data dari Server Component menggunakan secret key di server.

## 2. Instalasi
Butuh Node.js 20.9 atau lebih baru.

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SECRET_KEY
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=ganti-dengan-password-panjang-dan-unik
```

Gunakan `sb_secret_...` atau legacy `service_role` key. **Jangan gunakan `sb_publishable_...` pada variabel secret ini.** Jangan awali variabel rahasia dengan `NEXT_PUBLIC_`. Jangan commit `.env.local` ke Git.

## 3. Jalankan lokal

```bash
npm run dev
```

Buka `http://localhost:3000`. Browser akan meminta username dan password sesuai `DASHBOARD_USER` dan `DASHBOARD_PASSWORD`.

## 4. Jalankan di Raspberry Pi / server

Ekstrak folder ini, siapkan `.env.local`, lalu:

```bash
npm install
npm run build
npm run start
```

Dashboard bind ke `0.0.0.0:3000`, sehingga bisa diakses dari perangkat lain dalam jaringan melalui `http://IP_SERVER:3000`.

## Catatan keamanan
- `SUPABASE_SERVICE_ROLE_KEY` / `sb_secret_...` memiliki hak akses tinggi. Hanya simpan pada server tepercaya.
- Basic Auth ini cocok sebagai proteksi awal untuk dashboard internal. Untuk deployment internet publik, gunakan HTTPS dan autentikasi yang lebih kuat (mis. Supabase Auth / reverse-proxy SSO), batasi akses jaringan, dan rotasi password.
- Jangan membuka port dashboard ke internet tanpa HTTPS.

## Struktur data yang diharapkan
`rssi_samples` memakai kolom: `experiment_id`, `node` (`alice` atau `bob`), `sequence`, `rssi_dbm`, `peer_message`, `received_at`. Dashboard mengartikan `node` sebagai **node penerima RSSI**, sesuai program Python gateway.

## Download data per experiment

Pilih experiment dari chip di bagian **Eksperimen Aktif** atau klik experiment pada **Daftar Eksperimen**. Setelah experiment dipilih, tekan **Download CSV experiment**. File hanya berisi data experiment aktif dan mengambil seluruh sampel dari Supabase (dipaginasi 1.000 baris per permintaan), bukan hanya 100/3.000 sampel yang dipakai untuk tampilan.

Kolom CSV:
- `sequence`
- `timestamp_alice` dan `rssi_alice_dbm`
- `timestamp_bob` dan `rssi_bob_dbm`

Data Alice dan Bob dipasangkan berdasarkan `sequence`. Timestamp disimpan dalam format ISO dari database (umumnya UTC/offset asli), tidak disamakan karena waktu penerimaan kedua node bisa berbeda. Jika salah satu node belum memiliki sampel untuk sequence tertentu, kolomnya dibiarkan kosong. File CSV memakai UTF-8 BOM agar lebih mudah dibuka di Excel.
