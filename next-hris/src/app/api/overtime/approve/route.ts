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

    const { requestId, action } = await request.json(); // action: 'approve' | 'reject'
    if (!requestId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update status permohonan
    const { data: req, error: reqErr } = await supabaseAdmin
      .from("overtime_requests")
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .eq("id", requestId)
      .select("id, user_id, date, status")
      .single();
    if (reqErr) throw reqErr;

    // Jika approve: update kolom overtime di tabel attendance (kalau record sudah ada)
    if (action === "approve") {
      // Ambil data absen hari itu
      const { data: att } = await supabaseAdmin
        .from("attendance")
        .select("id, check_in_time, check_out_time")
        .eq("user_id", req.user_id)
        .eq("date", req.date)
        .single();

      if (att) {
        // Hitung jam kerja aktual
        let overtimeHours: number | null = null;
        if (att.check_in_time && att.check_out_time) {
          const ms = new Date(att.check_out_time).getTime() - new Date(att.check_in_time).getTime();
          if (ms > 0) {
            const workHours = Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
            overtimeHours = Math.round(workHours * 2 * 100) / 100; // lembur = jam kerja × 2
          }
        }

        await supabaseAdmin
          .from("attendance")
          .update({
            is_overtime: true,
            overtime_hours: overtimeHours,
            overtime_request_id: requestId,
          })
          .eq("id", att.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Lembur disetujui." : "Permohonan lembur ditolak.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
