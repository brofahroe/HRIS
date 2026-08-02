import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Haversine formula untuk menghitung jarak antara dua koordinat (dalam kilometer)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius bumi dalam km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Daftar Kordinat Lokasi Kantor
const OFFICE_LOCATIONS = [
  { name: 'Galeri Batik', lat: -8.1728895, lng: 112.5507406 },
  { name: 'Sanggar Batik', lat: -8.176151, lng: 112.548144 }
];
const MAX_RADIUS_KM = 0.1; // Radius maksimal absensi (100 meter)

export async function POST(request: Request) {
  try {
    // Inisialisasi Supabase khusus untuk API (Bypass RLS jika pakai Service Key)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''; // Gunakan service role untuk update data dari server
    
    // Inisialisasi admin client untuk operasi backend
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const { userId, lat, lng, photoBase64, time } = body;

    if (!userId || !lat || !lng) {
      return NextResponse.json({ error: "Data koordinat tidak lengkap" }, { status: 400 });
    }

    // 1. Validasi Jarak Lokasi (Cari lokasi terdekat)
    let minDistance = Infinity;
    let closestOffice = '';

    for (const office of OFFICE_LOCATIONS) {
      const distance = calculateDistance(office.lat, office.lng, lat, lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestOffice = office.name;
      }
    }

    if (minDistance > MAX_RADIUS_KM) {
      return NextResponse.json({ 
        error: "Anda berada di luar radius kantor (Galeri & Sanggar)", 
        distance: `${(minDistance * 1000).toFixed(0)} meter dari ${closestOffice}` 
      }, { status: 403 });
    }

    // 2. Tentukan Status Keterlambatan
    const checkInTime = new Date(time || Date.now());
    const maxCheckInTime = new Date(checkInTime);
    maxCheckInTime.setHours(8, 0, 0, 0);
    const status = checkInTime > maxCheckInTime ? 'Terlambat' : 'Hadir';
    const todayStr = checkInTime.toISOString().split('T')[0];

    // 3. Upload Foto Selfie ke Supabase Storage
    let photoUrl = null;
    if (photoBase64) {
      try {
        // Pastikan bucket attendance ada (Abaikan error jika sudah ada)
        await supabaseAdmin.storage.createBucket('attendance', { public: true });
        
        // Convert base64 ke buffer
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${userId}_${todayStr}_${Date.now()}.jpg`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin
          .storage
          .from('attendance')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseAdmin.storage.from('attendance').getPublicUrl(fileName);
        photoUrl = publicUrlData.publicUrl;
      } catch (storageErr) {
        console.error("Gagal upload foto:", storageErr);
        // Tetap lanjut meskipun gagal upload foto
      }
    }

    // 4. Simpan ke database
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .upsert({
        user_id: userId,
        date: todayStr,
        check_in_time: checkInTime.toISOString(),
        check_in_lat: lat,
        check_in_lng: lng,
        check_in_photo: photoUrl,
        status: status
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil Check In - ${status}`,
      data 
    });

  } catch (error: any) {
    console.error("Check-in Error:", error);
    return NextResponse.json({ error: `Kesalahan: ${error.message || JSON.stringify(error)}` }, { status: 500 });
  }
}
