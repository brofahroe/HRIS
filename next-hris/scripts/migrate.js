const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// Konfigurasi Supabase
// Gunakan Service Role Key untuk bypass RLS saat migrasi
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'URL_SUPABASE_ANDA';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'SERVICE_ROLE_KEY_ANDA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateUsers() {
  const users = [];
  
  console.log('Membaca file users.csv...');
  
  // Baca file CSV yang diexport dari Google Sheets
  fs.createReadStream('users.csv')
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
              email: user.Email, // Atau Username
              role: user.Role === 'Admin' ? 'Admin' : 'Employee',
              position: user.Jabatan,
              division: user.Divisi,
              daily_salary: parseFloat(user.GajiHarian) || 0,
              monthly_salary: parseFloat(user.GajiBulanan) || 0,
              is_active: user.StatusAktif === 'Aktif'
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

// Pastikan file users.csv ada di direktori yang sama sebelum menjalankan
if (fs.existsSync('users.csv')) {
  migrateUsers();
} else {
  console.error("File users.csv tidak ditemukan! Silakan export Sheet 'Users' dari Google Sheets sebagai CSV dan simpan di folder scripts ini.");
}
