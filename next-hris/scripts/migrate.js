const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL di .env.local tidak valid.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateUsers(csvPath) {
  const users = [];
  
  console.log('Membaca file users.csv...');
  
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (data) => users.push(data))
    .on('end', async () => {
      console.log(`Ditemukan ${users.length} data karyawan. Mulai registrasi ke Supabase Auth & Database...`);
      let success = 0;
      let failed = 0;

      for (const user of users) {
        try {
          const email = user.email || user.Username;
          const nik = user.NIK;
          
          // KARENA PASSWORD LAMA BERUPA HASH, KITA BUATKAN PASSWORD DEFAULT
          // Format: Batikseng + NIK (Contoh: Batikseng350711)
          const password = `Batikseng${nik}`;

          if (!email || !nik) {
            console.error(`[SKIP] Baris dilewati karena NIK atau Email kosong: ${user.NamaLengkap}`);
            failed++;
            continue;
          }

          // 1. Buat Akun di Supabase Auth (Supaya bisa Login)
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true // Langsung aktif tanpa perlu verifikasi email
          });

          if (authError) {
             // Jika error karena email sudah terdaftar, kita skip atau tangani
             if (authError.message.includes('already registered')) {
                console.error(`[ERROR] Gagal registrasi Auth: Email ${email} sudah terdaftar.`);
             } else {
                console.error(`[ERROR] Gagal registrasi Auth NIK ${nik}:`, authError.message);
             }
             failed++;
             continue;
          }

          const authId = authData.user.id;

          // 2. Simpan profil lengkap ke tabel public.users
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              auth_id: authId, // Hubungkan dengan ID Auth yang baru dibuat
              nik: nik,
              full_name: user.NamaLengkap,
              email: email,
              role: user.Role === 'Admin' ? 'Admin' : 'Employee',
              position: user.Jabatan,
              division: user.Divisi,
              daily_salary: parseFloat(user.GajiHarian) || 0,
              monthly_salary: parseFloat(user.GajiBulanan) || 0,
              is_active: String(user.StatusAktif).toUpperCase() === 'TRUE'
            });

          if (insertError) {
            console.error(`[ERROR] Gagal simpan profil NIK ${nik}:`, insertError.message);
            // Opsional: Hapus auth user jika profil gagal dibuat
            await supabase.auth.admin.deleteUser(authId);
            failed++;
          } else {
            success++;
          }

        } catch (err) {
          console.error(`[ERROR] Terjadi kesalahan sistem:`, err.message);
          failed++;
        }
      }

      console.log('========================');
      console.log(`Migrasi Selesai! Sukses: ${success}, Gagal: ${failed}`);
      console.log('========================');
    });
}

const csvPath = require('path').join(__dirname, 'users.csv');
if (fs.existsSync(csvPath)) {
  migrateUsers(csvPath);
} else {
  console.error("File users.csv tidak ditemukan!");
}
