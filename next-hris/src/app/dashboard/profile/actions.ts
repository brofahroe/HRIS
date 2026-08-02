"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(formData: FormData) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const userId = formData.get('userId') as string;
    const authId = formData.get('authId') as string;
    const fullName = formData.get('fullName') as string;
    const password = formData.get('password') as string;
    const photoBase64 = formData.get('photoBase64') as string;

    if (!userId || !authId) {
      return { success: false, error: "Data pengguna tidak valid." };
    }

    let photoUrl = undefined;

    // 1. Upload Foto Profil (Jika Ada)
    if (photoBase64) {
      try {
        await supabaseAdmin.storage.createBucket('avatars', { public: true });
        
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${userId}_${Date.now()}.jpg`;

        const { error: uploadError } = await supabaseAdmin
          .storage
          .from('avatars')
          .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(fileName);
          photoUrl = publicUrlData.publicUrl;
        }
      } catch (err) {
        console.error("Gagal upload avatar:", err);
      }
    }

    // 2. Update Data di public.users
    const updateData: any = {};
    if (fullName) updateData.full_name = fullName;
    if (photoUrl) updateData.photo_url = photoUrl;

    if (Object.keys(updateData).length > 0) {
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId);
        
      if (dbError) throw dbError;
    }

    // 3. Update Password di Supabase Auth (Jika Diisi)
    if (password && password.trim() !== '') {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        authId,
        { password: password }
      );
      if (authError) throw authError;
    }

    revalidatePath('/dashboard/profile');
    revalidatePath('/dashboard');
    
    return { success: true, message: "Profil berhasil diperbarui!" };
    
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    return { success: false, error: error.message || "Gagal memperbarui profil" };
  }
}
