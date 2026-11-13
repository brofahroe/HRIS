import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthedUser, getBearerToken } from "@/lib/apiAuth";
import { findClosestOffice, MAX_RADIUS_METERS } from "@/lib/officeLocations";

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
    // 1. Validasi Jarak Lokasi (Cari lokasi terdekat, radius maksimal 50m)
    const { minDistance, closestOffice, isWithinRadius } = findClosestOffice(lat, lng);

    if (!isWithinRadius) {
      return NextResponse.json({ 
        error: `Anda berada di luar radius kantor ${MAX_RADIUS_METERS} meter (Galeri & Sanggar)`, 
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

    // 3. Upload Foto Selfie ke Supabase Storage (dengan validasi base64)
    let photoUrl = null;
    if (typeof photoBase64 === "string" && photoBase64.startsWith("data:image/")) {
      try {
        const match = photoBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
        if (match) {
          const contentType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, "base64");

          // Pastikan buffer valid dan bukan corrupt/kosong (minimal 500 byte)
          if (buffer.length > 500) {
            await supabaseAdmin.storage.createBucket("attendance", { public: true });
            const ext = contentType.includes("png") ? "png" : "jpg";
            const fileName = `${userId}_${todayStr}_${Date.now()}.${ext}`;

            const { error: uploadError } = await supabaseAdmin
              .storage
              .from("attendance")
              .upload(fileName, buffer, {
                contentType,
                upsert: true,
              });

            if (!uploadError) {
              const { data: publicUrlData } = supabaseAdmin.storage
                .from("attendance")
                .getPublicUrl(fileName);
              photoUrl = publicUrlData.publicUrl;
            }
          }
        }
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

