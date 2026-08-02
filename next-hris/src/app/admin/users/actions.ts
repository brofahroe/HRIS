"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Menggunakan Service Role Key agar Admin bisa bypass RLS saat mengedit/menghapus
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function createUser(formData: FormData) {
  try {
    const email = (formData.get('email') as string || '').trim();
    const nik = (formData.get('nik') as string || '').trim();
    const fullName = (formData.get('full_name') as string || '').trim();
    const position = (formData.get('position') as string || '').trim();
    const division = (formData.get('division') as string || '').trim();
    const role = formData.get('role') as string || 'Employee';
    const dailySalary = parseFloat(formData.get('daily_salary') as string) || 0;
    const monthlySalary = parseFloat(formData.get('monthly_salary') as string) || 0;

    if (!email || !nik || !fullName) {
      return { success: false, error: "Email, NIK, dan Nama Lengkap wajib diisi." };
    }

    // Password default berdasarkan role — user wajib ganti saat login pertama
    const tempPassword = role === 'Admin' ? 'Admin123' : 'Batik123';

    // 1. Buat akun auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });
    if (authError) throw authError;

    // 2. Simpan profil ke public.users
    const { error: insertError } = await supabase.from('users').insert({
      auth_id: authData.user.id,
      email,
      nik,
      full_name: fullName,
      position,
      division,
      role: role === 'Admin' ? 'Admin' : 'Employee',
      daily_salary: dailySalary,
      monthly_salary: monthlySalary,
      is_active: true,
      must_change_password: true,
    });

    if (insertError) {
      // Roll back auth user bila profil gagal
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw insertError;
    }

    revalidatePath('/admin/users');
    return { success: true, message: `Karyawan ${fullName} berhasil dibuat. Password default: "${tempPassword}" — wajib diganti saat login pertama.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUser(userId: string, data: any) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        full_name: data.full_name,
        nik: data.nik,
        position: data.position,
        division: data.division,
        role: data.role,
        is_active: data.is_active
      })
      .eq('id', userId);

    if (error) throw error;

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resetPassword(authId: string, newPassword: string) {
  try {
    if (!authId) return { success: false, error: "Auth ID tidak ditemukan." };
    if (newPassword.length < 6) return { success: false, error: "Password minimal 6 karakter." };

    const { error } = await supabase.auth.admin.updateUserById(authId, {
      password: newPassword
    });
    if (error) throw error;

    // Tandai harus ganti password
    await supabase.from('users').update({ must_change_password: true }).eq('auth_id', authId);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUser(userId: string, authId: string) {
  try {
    // 1. Hapus dari public.users
    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) throw dbError;

    // 2. Hapus dari auth.users jika auth_id ada
    if (authId) {
      const { error: authError } = await supabase.auth.admin.deleteUser(authId);
      if (authError) throw authError;
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
