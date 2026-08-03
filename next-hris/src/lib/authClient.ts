import { supabase } from "./supabaseClient";

/**
 * Mengambil access token sesi Supabase yang sedang aktif di browser.
 * Dipakai untuk mengirim header `Authorization: Bearer <token>` ke API routes,
 * atau sebagai parameter ke Server Actions, supaya server bisa memverifikasi
 * identitas & role pemanggil sebelum mengeksekusi operasi sensitif.
 */
export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
