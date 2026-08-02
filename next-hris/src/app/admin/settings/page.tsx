"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [resetting, setResetting] = useState(false);

  const handleResetAllPasswords = async () => {
    if (!confirm(
      'Reset semua password?\n\n' +
      '• Karyawan → "Batik123"\n' +
      '• Admin → "Admin123"\n\n' +
      'Semua user akan diminta ganti password saat login berikutnya.'
    )) return;

    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { alert('Sesi tidak ditemukan. Silakan login ulang.'); return; }

      const res = await fetch('/api/reset-passwords', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) alert(result.message);
      else alert('Gagal: ' + result.error);
    } catch { alert('Terjadi kesalahan jaringan.'); }
    finally { setResetting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-1">Konfigurasi</p>
        <h2 className="font-serif text-3xl font-bold text-[#3e2723]">Pengaturan Sistem</h2>
        <p className="text-[#3e2723]/50 mt-1 text-sm">Konfigurasi variabel dan pengaturan HRIS.</p>
      </div>

      {/* Pengaturan Absensi */}
      <div className="bg-white rounded-2xl border border-[#e8e0d8] shadow-[0_2px_12px_rgba(192,72,56,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e8e0d8] bg-[#faf8f5]">
          <h3 className="font-semibold text-[#3e2723]">Pengaturan Absensi</h3>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Jam Masuk Standar</label>
              <input type="time" defaultValue="08:00"
                className="w-full px-4 py-3 border border-[#e8e0d8] rounded-xl focus:ring-2 focus:ring-[#c04838]/10 focus:border-[#c04838] outline-none transition-all text-[#3e2723]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Jam Pulang Standar</label>
              <input type="time" defaultValue="16:00"
                className="w-full px-4 py-3 border border-[#e8e0d8] rounded-xl focus:ring-2 focus:ring-[#c04838]/10 focus:border-[#c04838] outline-none transition-all text-[#3e2723]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Toleransi Keterlambatan (Menit)</label>
              <input type="number" defaultValue="15"
                className="w-full px-4 py-3 border border-[#e8e0d8] rounded-xl focus:ring-2 focus:ring-[#c04838]/10 focus:border-[#c04838] outline-none transition-all text-[#3e2723]" />
            </div>
          </div>
          <div className="pt-2">
            <button className="bg-[#c04838] hover:bg-[#98382d] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_12px_rgba(192,72,56,0.25)] transition-colors">
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>

      {/* Keamanan Akun */}
      <div className="bg-white rounded-2xl border border-[#e8e0d8] shadow-[0_2px_12px_rgba(192,72,56,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e8e0d8] bg-[#faf8f5]">
          <h3 className="font-semibold text-[#3e2723]">Keamanan Akun</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#faf8f5] rounded-2xl border border-[#e8e0d8]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert size={16} className="text-[#c04838]" />
                <span className="font-semibold text-[#3e2723] text-sm">Reset Semua Password</span>
              </div>
              <p className="text-xs text-[#3e2723]/50 leading-relaxed">
                Reset password seluruh karyawan ke <code className="bg-white px-1.5 py-0.5 rounded border border-[#e8e0d8] font-mono">"Batik123"</code> dan
                admin ke <code className="bg-white px-1.5 py-0.5 rounded border border-[#e8e0d8] font-mono">"Admin123"</code>.
                Semua user akan diminta ganti password saat login berikutnya.
              </p>
            </div>
            <button
              onClick={handleResetAllPasswords}
              disabled={resetting}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#c04838] hover:bg-[#98382d] disabled:opacity-70 text-white rounded-xl font-semibold text-sm transition-colors shadow-[0_4px_12px_rgba(192,72,56,0.25)]"
            >
              {resetting ? <><Loader2 size={14} className="animate-spin" /> Mereset...</> : 'Reset Password'}
            </button>
          </div>
          <p className="text-xs text-[#3e2723]/30 leading-relaxed">
            Gunakan fitur ini untuk onboarding massal karyawan baru atau ketika ada karyawan yang lupa password.
          </p>
        </div>
      </div>
    </div>
  );
}
