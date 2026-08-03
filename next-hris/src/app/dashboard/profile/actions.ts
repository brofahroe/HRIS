"use server";

import { revalidatePath } from "next/cache";
import { getAuthedUser, getSupabaseAdmin } from "@/lib/apiAuth";

export async function updateProfileAction(formData: FormData) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // PENTING: userId & authId TIDAK diambil dari formData (bisa dipalsukan
    // oleh siapa saja untuk mengganti password/foto akun orang lain).
    // Sebagai gantinya, identitas selalu diverifikasi dari access token sesi
    // yang aktif, lalu operasi hanya menyasar akun milik token tersebut.
    const token = formData.get('token') as string;
    const authedUser = await getAuthedUser(token);
    if (!authedUser) {
      return { success: false, error: "Sesi tidak valid. Silakan login ulang." };
    }
    const userId = authedUser.id;
    const authId = authedUser.auth_id;

    const fullName = formData.get('fullName') as string;
    const password = formData.get('password') as string;
    const photoBase64 = formData.get('photoBase64') as string;

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

      // Hapus flag wajib ganti password
      await supabaseAdmin.from('users').update({ must_change_password: false }).eq('id', userId);
    }

    revalidatePath('/dashboard/profile');
    revalidatePath('/dashboard');
    
    return { success: true, message: "Profil berhasil diperbarui!" };
    
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    return { success: false, error: error.message || "Gagal memperbarui profil" };
  }
}
