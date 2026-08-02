const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Konfigurasi Supabase
// Gunakan Service Role Key untuk bypass RLS saat migrasi. Jika menggunakan Anon Key, pastikan RLS di Supabase dilonggarkan sementara.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL di .env.local tidak valid atau tidak terbaca.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateUsers(csvPath) {
  const users = [];
  
  console.log('Membaca file users.csv...');
  
  // Baca file CSV yang diexport dari Google Sheets
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (data) => users.push(data))
    .on('end', async () => {
      console.log(`Ditemukan ${users.length} data karyawan. Mulai migrasi ke Supabase...`);
      
      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // 1. Buat Auth User di Supabase (Opsional: Jika ingin otomatis buat akun login)
          /*
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.Email,
            password: 'Password123!', // Password default sementara
            email_confirm: true
          });
          if (authError) throw authError;
          */

          // 2. Insert ke tabel public.users
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              // Sesuaikan mapping ini dengan nama kolom di CSV Google Sheets Anda
              nik: user.NIK,
              full_name: user.NamaLengkap,
              email: user.email || user.Username, // Menggunakan lowercase 'email' sesuai CSV Anda
              role: user.Role === 'Admin' ? 'Admin' : 'Employee',
              position: user.Jabatan,
              division: user.Divisi,
              daily_salary: parseFloat(user.GajiHarian) || 0,
              monthly_salary: parseFloat(user.GajiBulanan) || 0,
              is_active: String(user.StatusAktif).toUpperCase() === 'TRUE'
            });

          if (insertError) throw insertError;
          successCount++;
          console.log(`[SUCCESS] Migrasi data NIK: ${user.NIK}`);
        } catch (err) {
          errorCount++;
          console.error(`[ERROR] Gagal migrasi NIK: ${user.NIK}`, err.message);
        }
      }
      
      console.log('====================================');
      console.log(`Migrasi Selesai! Sukses: ${successCount}, Gagal: ${errorCount}`);
      console.log('====================================');
    });
}

const csvPath = require('path').join(__dirname, 'users.csv');

// Pastikan file users.csv ada di direktori yang sama sebelum menjalankan
if (fs.existsSync(csvPath)) {
  migrateUsers(csvPath);
} else {
  console.error("File users.csv tidak ditemukan! Silakan export Sheet 'Users' dari Google Sheets sebagai CSV dan simpan di folder scripts ini.");
}
