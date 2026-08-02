import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

const OFFICE_LOCATIONS = [
  { name: 'Galeri Batik', lat: -8.1728895, lng: 112.5507406 },
  { name: 'Sanggar Batik', lat: -8.176151, lng: 112.548144 }
];
const MAX_RADIUS_KM = 0.1; // 100 meter

function normalizeNotes(prevNotes: string | null | undefined, totalHours: number | null) {
  let base = prevNotes || '';
  // Hapus catatan TotalJam yang lama bila ada
  base = base.replace(/\bTotalJam:\s*[\d.]+\s*/g, '').trim();
  if (totalHours === null) return base;
  const suffix = `TotalJam: ${totalHours}`;
  return base ? `${base} ${suffix}` : suffix;
}

export async function POST(request: Request) {
  try {
    // Inisialisasi Supabase Client khusus server
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const { userId, lat, lng, photoBase64, time } = body;

    if (!userId || !lat || !lng) {
      return NextResponse.json({ error: "Data koordinat tidak lengkap" }, { status: 400 });
    }

    // 1. Validasi lokasi kantor
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

    const checkOutTime = new Date(time || Date.now());
    const todayStr = checkOutTime.toISOString().split('T')[0];

    // 2. Cari absensi masuk hari ini (harus ada check-in dulu)
    const { data: existing, error: findError } = await supabaseAdmin
      .from('attendance')
      .select('id, check_in_time, notes')
      .eq('user_id', userId)
      .eq('date', todayStr)
      .single();

    if (findError || !existing) {
      return NextResponse.json(
        { error: "Absensi masuk tidak ditemukan untuk hari ini. Check-in terlebih dahulu." },
        { status: 404 }
      );
    }

    // 2b. Cek apakah sudah checkout
    const { data: current, error: currentErr } = await supabaseAdmin
      .from('attendance')
      .select('check_out_time')
      .eq('id', existing.id)
      .single();

    if (currentErr) throw currentErr;
    if (current?.check_out_time) {
      return NextResponse.json({ error: "Anda sudah melakukan Check-Out hari ini." }, { status: 409 });
    }

    // 3. Hitung total jam kerja
    let totalHours = null;
    if (existing.check_in_time) {
      const ms = checkOutTime.getTime() - new Date(existing.check_in_time).getTime();
      if (ms > 0) totalHours = Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
    }

    // 4. Upload foto selfie pulang ke storage
    let photoUrl = null;
    if (photoBase64) {
      try {
        await supabaseAdmin.storage.createBucket('attendance', { public: true });
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${userId}_${todayStr}_checkout_${Date.now()}.jpg`;

        const { error: uploadError } = await supabaseAdmin
          .storage
          .from('attendance')
          .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabaseAdmin.storage.from('attendance').getPublicUrl(fileName);
          photoUrl = publicUrlData.publicUrl;
        }
      } catch (storageErr) {
        console.error("Gagal upload foto checkout:", storageErr);
      }
    }

    // 5. Update baris attendance
    const notes = normalizeNotes(existing.notes, totalHours);

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .update({
        check_out_time: checkOutTime.toISOString(),
        check_out_lat: lat,
        check_out_lng: lng,
        check_out_photo: photoUrl,
        notes: notes
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Berhasil Check-Out! Total jam kerja: ${totalHours !== null ? totalHours + ' jam' : '-'}`,
      data
    });

  } catch (error: any) {
    console.error("Check-out Error:", error);
    return NextResponse.json({ error: `Kesalahan: ${error.message || JSON.stringify(error)}` }, { status: 500 });
  }
}
