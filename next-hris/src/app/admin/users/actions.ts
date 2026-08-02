"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Menggunakan Service Role Key agar Admin bisa bypass RLS saat mengedit/menghapus
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

export async function deleteUser(userId: string, authId: string) {
  try {
    // 1. Hapus dari public.users
    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
      
    if (dbError) throw dbError;

    // 2. Hapus dari auth.users (Sistem Login) jika auth_id ada
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
