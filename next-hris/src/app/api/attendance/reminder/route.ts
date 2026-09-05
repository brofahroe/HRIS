import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthedAdmin, getBearerToken } from "@/lib/apiAuth";
import { Resend } from "resend";
import { WIB_OFFSET_HOURS, getWIBDate } from "@/lib/wib";

const CHECK_IN_REMINDER_AFTER = 7 * 60 + 30; // 07:30 WIB
const CHECK_OUT_REMINDER_AFTER = 15 * 60 + 30; // 15:30 WIB

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Konfigurasi server tidak lengkap." }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const admin = await getAuthedAdmin(getBearerToken(request));
    if (!admin) {
      return NextResponse.json({ error: "Akses ditolak. Hanya Admin." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const type: "checkin" | "checkout" | "both" = body.type || "both";

    const now = new Date();
    const wibMinutes =
      (now.getUTCHours() + WIB_OFFSET_HOURS) * 60 + now.getUTCMinutes() - 0; // getUTCHours on a UTC Date
    // Recompute properly with WIB offset
    const wibNow = new Date(now.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
    const currentWIBMinutes = wibNow.getUTCHours() * 60 + wibNow.getUTCMinutes();

    const todayStr = getWIBDate(wibNow);
    const resend = new Resend(process.env.RESEND_API_KEY || "dummy_key_for_build");

    // Fetch all active employees
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email, nik")
      .eq("is_active", true)
      .in("role", ["Karyawan", "Supervisor"]);

    if (usersError) throw usersError;

    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const user of users || []) {
      const { data: attData } = await supabaseAdmin
        .from("attendance")
        .select("check_in_time, check_out_time")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .single();

      const hasCheckedIn = attData?.check_in_time != null;
      const hasCheckedOut = attData?.check_out_time != null;
      const email = (user as any).email;

      if (!email) {
        skippedCount++;
        continue;
      }

      let shouldSend = false;
      let subject = "";
      let html = "";

      // Check-in reminder: send at 07:30+ WIB if not checked in
      if ((type === "checkin" || type === "both") && currentWIBMinutes >= CHECK_IN_REMINDER_AFTER && !hasCheckedIn) {
        shouldSend = true;
        subject = "Pengingat: Absen Masuk Belum Dilakukan";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #c04838;">Pengingat Absen Masuk</h2>
            <p>Halo ${user.full_name || "Karyawan"},</p>
            <p>Anda belum melakukan absen masuk hari ini.</p>
            <p><strong>Jam masuk normal:</strong> 08:00 WIB</p>
            <p>Silakan buka aplikasi HRIS dan lakukan check-in sesegera mungkin.</p>
            <p style="color: #c04838; font-weight: bold;">Wajib check-in maksimal jam 08:30 WIB.</p>
          </div>
        `;
      }

      // Check-out reminder: send at 15:30+ WIB if checked in but not checked out
      if ((type === "checkout" || type === "both") && currentWIBMinutes >= CHECK_OUT_REMINDER_AFTER && hasCheckedIn && !hasCheckedOut) {
        shouldSend = true;
        subject = "Pengingat: Absen Pulang Belum Dilakukan";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #c04838;">Pengingat Absen Pulang</h2>
            <p>Halo ${user.full_name || "Karyawan"},</p>
            <p>Anda sudah absen masuk hari ini tetapi belum melakukan absen pulang.</p>
            <p><strong>Jam pulang normal:</strong> 16:00 WIB</p>
            <p>Silakan buka aplikasi HRIS dan lakukan check-out sebelum akhir shift.</p>
          </div>
        `;
      }

      if (shouldSend) {
        try {
          await resend.emails.send({
            from: "HRIS System <noreply@hris-modern.example.com>",
            to: [email],
            subject,
            html,
          });
          sentCount++;
        } catch (mailErr: any) {
          errors.push(`${user.full_name || user.nik}: ${mailErr.message}`);
        }
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pengingat dikirim ke ${sentCount} pengguna. ${skippedCount} dilewati.`,
      sent: sentCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
