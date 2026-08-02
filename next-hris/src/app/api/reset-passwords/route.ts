import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

const DEFAULT_EMPLOYEE_PASSWORD = "Batik123";
const DEFAULT_ADMIN_PASSWORD    = "Admin123";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verifikasi Bearer token
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Token tidak valid.' }, { status: 401 });
    }

    // Pastikan pemanggil adalah Admin
    const { data: caller } = await supabaseAdmin
      .from('users').select('role').eq('auth_id', user.id).single();
    if (caller?.role !== 'Admin') {
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
