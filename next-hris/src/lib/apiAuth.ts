import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Helper autentikasi & otorisasi terpusat untuk API routes dan Server Actions.
 *
 * Latar belakang: sebagian besar endpoint di aplikasi ini menggunakan
 * SUPABASE_SERVICE_ROLE_KEY (yang melewati/bypass semua Row Level Security).
 * Karena itu, verifikasi "siapa yang memanggil & berhak melakukan apa" WAJIB
 * dilakukan secara eksplisit di sini — RLS di database tidak lagi berlaku
 * sebagai lapisan pertahanan untuk endpoint-endpoint tersebut.
 */

let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Konfigurasi server tidak lengkap: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diset."
    );
  }

  cachedAdmin = createClient(supabaseUrl, supabaseServiceKey);
  return cachedAdmin;
}

export interface AuthedUser {
  id: string; // public.users.id
  auth_id: string; // auth.users.id (Supabase Auth)
  role: string;
  is_active: boolean;
  full_name?: string | null;
}

/**
 * Memverifikasi Supabase access token dan mengambil baris profil terkait
 * di tabel public.users. Mengembalikan null bila token tidak valid,
 * profil tidak ditemukan, atau akun nonaktif.
 */
export async function getAuthedUser(token: string | null | undefined): Promise<AuthedUser | null> {
  if (!token) return null;

  const supabaseAdmin = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, role, is_active, full_name")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return null;
  if (profile.is_active === false || profile.is_active === "FALSE") return null;

  return profile as AuthedUser;
}

/** Sama seperti getAuthedUser, tapi mewajibkan role === 'Admin'. */
export async function getAuthedAdmin(token: string | null | undefined): Promise<AuthedUser | null> {
  const user = await getAuthedUser(token);
  if (!user || user.role !== "Admin") return null;
  return user;
}

/** Mengambil Bearer token dari header Authorization pada Request (API routes). */
export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

