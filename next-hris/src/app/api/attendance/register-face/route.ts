import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { getAuthedUser, getBearerToken } from "@/lib/apiAuth";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verifikasi identitas pemanggil — jangan percaya userId dari body,
    // supaya seseorang tidak bisa menimpa data wajah milik orang lain.
    const authedUser = await getAuthedUser(getBearerToken(request));
    if (!authedUser) {
      return NextResponse.json({ error: "Tidak terautentikasi. Silakan login ulang." }, { status: 401 });
    }

    const body = await request.json();
    const { faceDescriptor } = body;
    const userId = authedUser.id;

    if (!faceDescriptor) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Ubah faceDescriptor menjadi string JSON
    const descriptorString = JSON.stringify(faceDescriptor);

    // Simpan ke database
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ face_descriptor: descriptorString })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: "Data wajah berhasil didaftarkan!",
      data 
    });

  } catch (error: any) {
    console.error("Face Registration Error:", error);
    return NextResponse.json({ error: `Kesalahan: ${error.message || JSON.stringify(error)}` }, { status: 500 });
  }
}

