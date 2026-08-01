# HRIS Modern (v2)

Sistem Human Resource Information System (HRIS) modern yang dibangun sebagai peningkatan dari Google Apps Script (GAS) ke platform yang lebih terukur, cepat, dan 100% gratis.

## Tech Stack
- **Frontend & Backend**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL)
- **Hosting**: Vercel

## Fitur Utama
- **Sistem Autentikasi**: Login aman dengan Supabase Auth.
- **Dashboard Karyawan**: Check-In dan Check-Out (Absensi).
- **Dashboard Admin**: Pengelolaan data karyawan, lembur, kasbon, dan slip gaji (Payroll).

## Cara Menjalankan Secara Lokal

1. Clone repositori ini.
2. Masuk ke folder proyek: `cd next-hris`
3. Install dependencies: `npm install`
4. Buat file `.env.local` dan tambahkan kredensial Supabase Anda:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=url_anda_disini
   NEXT_PUBLIC_SUPABASE_ANON_KEY=anon_key_anda_disini
   ```
5. Jalankan server lokal: `npm run dev`
6. Buka [http://localhost:3000](http://localhost:3000)

## Skema Database
Silakan eksekusi perintah SQL yang terdapat pada `supabase_schema.sql` di SQL Editor pada proyek Supabase Anda.

## Skrip Migrasi
Terdapat skrip `scripts/migrate.js` yang digunakan untuk memigrasi data `users.csv` dari sistem Google Sheets lama ke Supabase secara otomatis.
