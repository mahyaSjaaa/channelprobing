# LoRa Channel Probing Dashboard

Dashboard Next.js ini sudah dimodifikasi untuk kontrol remote Alice, Bob, dan Eve melalui Supabase. Fitur meliputi start/stop agent, status Raspberry Pi, data RSSI Eve, grafik, pagination 50 baris per halaman, dan CSV export seluruh sampel.

Lihat `../README.md` untuk instruksi lengkap setup Supabase, agent systemd pada tiga Raspberry Pi, dan deployment dashboard pada host terpisah.

Dashboard menggunakan Supabase secret key hanya pada server melalui `.env.local`. Jangan gunakan `NEXT_PUBLIC_` untuk key. Basic Auth dari project asal tetap aktif melalui `DASHBOARD_USER` dan `DASHBOARD_PASSWORD`.
