import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthedAdmin, getBearerToken } from "@/lib/apiAuth";

const DEFAULT_EMPLOYEE_PASSWORD = "Batik123";
const DEFAULT_ADMIN_PASSWORD    = "Admin123";

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Hanya Admin yang boleh mereset password massal.
    const admin = await getAuthedAdmin(getBearerToken(request));
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Admin.' }, { status: 403 });
    }

    // Ambil semua user aktif
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('users').select('id, auth_id, role, email').eq('is_active', true);
    if (fetchError) throw fetchError;

    let successCount = 0;
    const errors: { email?: string; error: string }[] = [];

    for (const u of users || []) {
      if (!u.auth_id) { errors.push({ email: u.email, error: 'auth_id kosong' }); continue; }
      try {
        const pwd = u.role === 'Admin' ? DEFAULT_ADMIN_PASSWORD : DEFAULT_EMPLOYEE_PASSWORD;
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(u.auth_id, { password: pwd });
        if (pwErr) throw pwErr;

        // Set must_change_password = true
        await supabaseAdmin.from('users').update({ must_change_password: true }).eq('id', u.id);
        successCount++;
      } catch (err: any) {
        errors.push({ email: u.email, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Password direset untuk ${successCount} pengguna. Karyawan: "${DEFAULT_EMPLOYEE_PASSWORD}", Admin: "${DEFAULT_ADMIN_PASSWORD}"`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
