import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Konfigurasi server tidak lengkap." }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const { userId, date, reason } = body;

    if (!userId || !date || !reason?.trim()) {
      return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
    }

    // Cek apakah sudah ada pengajuan lembur untuk hari ini
    const { data: existing } = await supabaseAdmin
      .from("overtime_requests")
      .select("id, status")
      .eq("user_id", userId)
      .eq("date", date)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        data: existing,
        message: existing.status === "approved"
          ? "Lembur hari ini sudah disetujui."
          : existing.status === "rejected"
          ? "Permohonan lembur hari ini ditolak. Anda tidak dapat check-in."
          : "Permohonan lembur hari ini sedang menunggu persetujuan admin.",
      });
    }

    // Buat permohonan baru
    const { data, error } = await supabaseAdmin
      .from("overtime_requests")
      .insert({ user_id: userId, date, reason: reason.trim(), status: "pending" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: "Permohonan lembur berhasil diajukan. Menunggu persetujuan admin.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
