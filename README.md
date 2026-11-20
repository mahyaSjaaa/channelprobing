# LoRa Channel Probing Dashboard

Dashboard Next.js ini sudah dimodifikasi untuk kontrol remote Alice, Bob, dan Eve melalui Supabase. Fitur meliputi start/stop agent, status Raspberry Pi, data RSSI Eve, grafik, pagination 50 baris per halaman, dan CSV export seluruh sampel.

Lihat `../README.md` untuk instruksi lengkap setup Supabase, agent systemd pada tiga Raspberry Pi, dan deployment dashboard pada host terpisah.

Dashboard menggunakan Supabase secret key hanya pada server melalui `.env.local`. Jangan gunakan `NEXT_PUBLIC_` untuk key. Basic Auth dari project asal tetap aktif melalui `DASHBOARD_USER` dan `DASHBOARD_PASSWORD`.


## Format CSV export

Dashboard menyediakan dua tombol unduh untuk setiap eksperimen:

- **CSV Alice & Bob**: `sequence,alice,bob,received_at`. Kolom `alice` dan `bob` berisi RSSI berdasarkan node penerima. Sampel dengan sequence yang sama digabung dalam satu baris. `received_at` menggunakan waktu WIB (`Asia/Jakarta`); untuk baris gabungan digunakan waktu penerimaan paling awal yang tersedia.
- **CSV Eve**: hanya berisi sampel dengan `node = eve`, menggunakan format kolom yang sama, yaitu `sequence,alice,bob,received_at`. Kolom `alice` dan `bob` berisi RSSI yang diterima Eve dari masing-masing transmitter. Sampel dengan sequence yang sama digabung dalam satu baris. Waktu diformat dalam WIB (`Asia/Jakarta`); untuk baris gabungan digunakan waktu penerimaan paling awal yang tersedia.

Data Eve tidak dimasukkan ke file CSV Alice & Bob.
