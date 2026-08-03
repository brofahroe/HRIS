"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getAccessToken } from "@/lib/authClient";
import { User, Camera, ArrowLeft, Save, Loader2, Lock } from "lucide-react";
import { updateProfileAction } from "./actions";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: userData } = await supabase
        .from('users').select('*').eq('auth_id', session.user.id).single();
      if (userData) {
        setProfile(userData);
        setFullName(userData.full_name || "");
        if (userData.photo_url) setPhotoPreview(userData.photo_url);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [router]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Ukuran foto maksimal 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (password && password.length < 6) { alert("Password baru minimal 6 karakter."); return; }
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) { alert("Sesi habis. Silakan login ulang."); setSaving(false); return; }
      const formData = new FormData();
      formData.append('token', token);
      formData.append('fullName', fullName);
      formData.append('password', password);
      formData.append('photoBase64', photoBase64);
      const result = await updateProfileAction(formData);
      if (result.success) {
        alert("Profil berhasil diperbarui!");
        setPassword("");
        if (password) await supabase.auth.refreshSession();
      } else {
        alert(result.error);
      }
    } catch { alert("Terjadi kesalahan sistem."); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#faf8f5] text-[#3e2723]/50">Memuat profil...</div>;
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] pb-20">
      {/* Header */}
      <header className="bg-white border-b border-[#e8e0d8] px-6 py-4 flex items-center sticky top-0 z-50">
        <Link href="/dashboard" className="mr-4 text-[#3e2723]/40 hover:text-[#c04838] transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="font-bold text-[#3e2723]">Edit Profil</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 md:p-6 mt-4">
        <form onSubmit={handleSave} className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(192,72,56,0.06)] border border-red-50 space-y-6">

          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-red-50 border-4 border-white shadow-lg flex items-center justify-center text-[#c04838] text-3xl font-bold uppercase">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  fullName.charAt(0)
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-[#c04838] hover:bg-[#98382d] text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <Camera size={16} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
            </div>
            <p className="text-xs text-[#3e2723]/40 text-center">Ketuk ikon kamera untuk mengganti foto<br />(Maks. 2MB)</p>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#3e2723] mb-1">NIK</label>
              <input type="text" value={profile?.nik} disabled className="w-full px-4 py-3 bg-[#faf8f5] border border-[#e8e0d8] rounded-xl text-[#3e2723]/50 text-sm" />
              <p className="text-xs text-[#3e2723]/30 mt-1">NIK tidak dapat diubah.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3e2723] mb-1">Email</label>
              <input type="email" value={profile?.email} disabled className="w-full px-4 py-3 bg-[#faf8f5] border border-[#e8e0d8] rounded-xl text-[#3e2723]/50 text-sm" />
              <p className="text-xs text-[#3e2723]/30 mt-1">Hubungi HRD jika ingin mengubah email.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3e2723] mb-1">Nama Lengkap</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#c04838]/50">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-[#e8e0d8] focus:border-[#c04838] focus:ring-4 focus:ring-[#c04838]/10 rounded-xl outline-none transition-all text-[#3e2723]"
                  required
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#f0ebe4]">
              <label className="block text-sm font-semibold text-[#3e2723] mb-1">Ganti Password <span className="font-normal text-[#3e2723]/40">(Opsional)</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#c04838]/50">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin ganti"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-[#e8e0d8] focus:border-[#c04838] focus:ring-4 focus:ring-[#c04838]/10 rounded-xl outline-none transition-all text-[#3e2723] placeholder:text-[#3e2723]/30"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-[#c04838] hover:bg-[#98382d] active:scale-[0.98] disabled:opacity-70 disabled:scale-100 transition-all text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(192,72,56,0.25)] mt-2"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </main>
    </div>
  );
}
