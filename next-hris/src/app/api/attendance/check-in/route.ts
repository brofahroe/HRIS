import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthedUser, getBearerToken } from "@/lib/apiAuth";

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Konfigurasi server tidak lengkap: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diset.");
      return NextResponse.json({ error: "Konfigurasi server tidak lengkap. Hubungi administrator." }, { status: 500 });
    }
    
    // Inisialisasi admin client untuk operasi backend
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verifikasi identitas pemanggil dari Bearer token — JANGAN percaya userId dari body,
    // karena body sepenuhnya dikontrol oleh client dan bisa dipalsukan untuk absen-kan orang lain.
    const authedUser = await getAuthedUser(getBearerToken(request));
    if (!authedUser) {
      return NextResponse.json({ error: "Tidak terautentikasi. Silakan login ulang." }, { status: 401 });
    }

    const body = await request.json();
    const { lat, lng, photoBase64, overtimeRequestId } = body;
    const userId = authedUser.id; // selalu dari token, bukan dari body

    if (!lat || !lng) {
      return NextResponse.json({ error: "Data koordinat tidak lengkap" }, { status: 400 });
    }

    // Jika ada overtimeRequestId, pastikan itu benar milik user ini dan sudah disetujui —
    // mencegah user menempelkan ID lembur milik orang lain / yang belum disetujui.
    let verifiedOvertimeRequestId: string | undefined = undefined;
    if (overtimeRequestId) {
      const { data: otReq } = await supabaseAdmin
        .from("overtime_requests")
        .select("id, user_id, status")
        .eq("id", overtimeRequestId)
        .single();
      if (otReq && otReq.user_id === userId && otReq.status === "approved") {
        verifiedOvertimeRequestId = otReq.id;
      }
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

    // 2. Tentukan Status Keterlambatan & tanggal WIB
    // WIB = UTC+7. Komputasi eksplisit agar tidak bergantung timezone server (Vercel default UTC).
    const WIB_OFFSET_HOURS = 7;
    const WORK_START_HOUR = 8; // 08:00 WIB
    const now = new Date(); // instan UTC real
    const wibNow = new Date(now.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000); // WIB wall-clock as UTC instant

    // Cutoff 08:00 WIB diekspresikan sebagai instan UTC (08:00 WIB = 01:00 UTC)
    const cutoffWIB = new Date(wibNow);
    cutoffWIB.setUTCHours(WORK_START_HOUR, 0, 0, 0); // 08:00 WIB diekspresikan dlm "WIB-as-UTC"
    const status = wibNow > cutoffWIB ? 'Terlambat' : 'Hadir';

    // Tanggal WIB (YYYY-MM-DD di WIB)
    const todayStr = wibNow.toISOString().slice(0, 10);

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
        check_in_time: now.toISOString(),
        check_in_lat: lat,
        check_in_lng: lng,
        check_in_photo: photoUrl,
        status: status,
        // Tandai sebagai lembur jika ada overtimeRequestId yang terverifikasi (approval akan set is_overtime=true)
        ...(verifiedOvertimeRequestId ? { overtime_request_id: verifiedOvertimeRequestId } : {}),
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

