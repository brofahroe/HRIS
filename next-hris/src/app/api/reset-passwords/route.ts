import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    // 1. Verifikasi identitas pemanggil dari Bearer token
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi. Berikan Bearer token.' },
        { status: 401 }
      );
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Token tidak valid.' },
        { status: 401 }
      );
    }

    // 2. Pastikan pemanggil adalah Admin
    const { data: caller, error: callerError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single();

    if (callerError || caller?.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya Admin yang dapat mereset password.' },
        { status: 403 }
      );
    }

    // 3. Ambil semua karyawan (bukan admin lain)
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('auth_id, role, full_name, email')
      .eq('is_active', true);

    if (fetchError) throw fetchError;
    if (!users || users.length === 0) {
      return NextResponse.json({ message: "Tidak ada pengguna aktif ditemukan." });
    }

    let successCount = 0;
    const errors: { email?: string; error: string }[] = [];

    // 4. Generate password acak kuat untuk tiap user, lalu kirim via email
    for (const u of users) {
      if (!u.auth_id) {
        errors.push({ email: u.email, error: 'auth_id kosong' });
        continue;
      }

      try {
        const newPassword = randomBytes(12).toString('base64').slice(0, 16);

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          u.auth_id,
          { password: newPassword }
        );

        if (updateError) throw updateError;
        successCount++;

        // Catat (jangan kirim ke response berisi password asli di prod)
        console.log(`Reset password untuk ${u.email}: password baru = ${newPassword}`);
      } catch (err: any) {
        errors.push({ email: u.email, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mereset password untuk ${successCount} pengguna.`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Reset Passwords Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
