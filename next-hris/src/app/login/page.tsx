"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Username atau password salah");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Ambil role dari tabel users untuk menentukan halaman tujuan
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', data.user.id)
          .single();

        if (userData?.role === 'Admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col relative overflow-hidden text-[#3e2723]">
      
      {/* Top Right Badge (Hidden on mobile) */}
      <div className="hidden md:flex absolute top-8 right-12 items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-red-100 text-sm font-medium text-[#c04838]">
        Selfie & GPS Verified
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* Left Column: Hero Text */}
          <div className="flex flex-col space-y-8">
            
            {/* Logo area */}
            <div className="flex items-center gap-3 mb-4 lg:mb-12">
              <div className="w-10 h-10 bg-[#c04838] text-white rounded-xl flex items-center justify-center transform rotate-12">
                <span className="font-serif font-bold text-2xl italic">B</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#c04838] text-xl leading-none">Batik Seng</span>
                <span className="text-[10px] tracking-widest text-[#3e2723]/60 font-bold uppercase mt-1">HRIS Portal</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-px bg-[#c04838]"></div>
                <span className="text-xs font-bold tracking-[0.2em] text-[#c04838] uppercase">Employee Workspace</span>
              </div>
              
              <h1 className="font-serif text-5xl lg:text-7xl font-bold text-[#c04838] leading-[1.1] mb-6">
                Kehadiran yang<br />tertata.
              </h1>
              
              <p className="text-lg lg:text-xl text-[#3e2723]/70 max-w-lg leading-relaxed">
                Portal internal Batik Seng untuk pencatatan kehadiran, verifikasi lokasi, dan dokumentasi selfie yang ringkas dalam satu alur.
              </p>
            </div>

            {/* Features Tags */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-[#3e2723]/70">
                <div className="w-2 h-2 rounded-full bg-[#c04838]"></div>
                GPS verified
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-[#3e2723]/70">
                <div className="w-2 h-2 rounded-full bg-[#c04838]"></div>
                Selfie attendance
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-[#3e2723]/70">
                <div className="w-2 h-2 rounded-full bg-[#c04838]"></div>
                Payroll recap
              </div>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
            <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(192,72,56,0.05)] border border-red-50/50">
              
              <div className="mb-8">
                <span className="text-[#c04838] text-[10px] uppercase font-bold tracking-widest mb-3 block">Portal Karyawan</span>
                <h2 className="font-serif text-4xl font-bold text-[#3e2723] mb-3">Selamat datang</h2>
                <p className="text-sm text-[#3e2723]/60 leading-relaxed">
                  Gunakan akun internal Anda untuk melanjutkan ke halaman absensi.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#3e2723]">Username</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan username (email)"
                    className="w-full px-5 py-4 bg-white border border-slate-200 focus:border-[#c04838] focus:ring-4 focus:ring-[#c04838]/10 rounded-xl outline-none transition-all text-[#3e2723] placeholder:text-slate-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#3e2723]">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className="w-full px-5 py-4 bg-white border border-slate-200 focus:border-[#c04838] focus:ring-4 focus:ring-[#c04838]/10 rounded-xl outline-none transition-all text-[#3e2723] placeholder:text-slate-400 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#c04838] hover:text-[#98382d] p-1 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#c04838] hover:bg-[#98382d] active:scale-[0.98] transition-all text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(192,72,56,0.25)] hover:shadow-[0_8px_25px_rgba(192,72,56,0.35)] disabled:opacity-70 disabled:hover:scale-100 mt-2"
                >
                  {loading ? (
                    <><Loader2 className="animate-spin" size={20} /> Memproses...</>
                  ) : (
                    "Masuk ke portal"
                  )}
                </button>

                <p className="text-center text-xs text-[#3e2723]/60 pt-4">
                  Akses terbatas untuk karyawan Batik Seng.{" "}
                  <a href="#" className="text-[#c04838] hover:underline font-semibold">Lupa Password</a>
                </p>
              </form>
            </div>
          </div>
          
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center text-xs font-medium text-[#3e2723]/40">
        HRIS Ver 2.0.0 © 2026 BatikSengguruh.com
      </div>
    </div>
  );
}
