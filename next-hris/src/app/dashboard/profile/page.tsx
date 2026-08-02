"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
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
      if (!session) {
        router.push("/login");
        return;
      }
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();
      
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
    if (file) {
      // Validasi ukuran max 2MB
      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran foto maksimal 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    if (password && password.length < 6) {
      alert("Password baru minimal 6 karakter.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('userId', profile.id);
      formData.append('authId', profile.auth_id);
      formData.append('fullName', fullName);
      formData.append('password', password);
      formData.append('photoBase64', photoBase64);

      const result = await updateProfileAction(formData);
      
      if (result.success) {
        alert("Profil berhasil diperbarui!");
        setPassword(""); // Reset field password
        // Refresh session if password changed
        if (password) {
          await supabase.auth.refreshSession();
        }
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Memuat profil...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center sticky top-0 z-50">
        <Link href="/dashboard" className="mr-4 text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="font-bold text-xl text-slate-800">Edit Profil</h1>
      </header>

      <main className="max-w-md mx-auto p-4 md:p-6 mt-4">
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          
          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center text-blue-600 text-3xl font-bold uppercase">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  fullName.charAt(0)
                )}
              </div>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <Camera size={16} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/jpeg, image/png, image/webp" 
                onChange={handlePhotoChange}
              />
            </div>
            <p className="text-sm text-slate-500 text-center">Ketuk ikon kamera untuk mengganti foto<br/>(Maks. 2MB)</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIK</label>
              <input 
                type="text" 
                value={profile?.nik} 
                disabled 
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
              />
              <p className="text-xs text-slate-400 mt-1">NIK tidak dapat diubah.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input 
                type="email" 
                value={profile?.email} 
                disabled 
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
              />
              <p className="text-xs text-slate-400 mt-1">Hubungi HRD jika ingin mengubah email.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl outline-none transition-all text-slate-700"
                  required
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-1">Ganti Password (Opsional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin ganti"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl outline-none transition-all text-slate-700"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-70 disabled:scale-100 transition-all text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 mt-6"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </main>
    </div>
  );
}
