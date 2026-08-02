import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Ambil semua user dari tabel public.users
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, auth_id, role, full_name, email');

    if (fetchError) throw fetchError;
    if (!users || users.length === 0) {
      return NextResponse.json({ message: "Tidak ada user ditemukan." });
    }

    let successCount = 0;
    const errors = [];

    // 2. Loop dan reset password berdasarkan Role
    for (const user of users) {
      try {
        const newPassword = user.role === 'Admin' ? 'admin123' : 'user123';
        
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.auth_id,
          { password: newPassword }
        );

        if (updateError) throw updateError;
        successCount++;
        
      } catch (err: any) {
        errors.push({ email: user.email, error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mereset password untuk ${successCount} pengguna.`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
