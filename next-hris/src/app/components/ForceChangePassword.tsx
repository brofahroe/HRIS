"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { updateProfileAction } from "@/app/dashboard/profile/actions";

interface Props {
  userId: string;
  authId: string;
  userName: string;
  onSuccess: () => void;
}

export default function ForceChangePassword({ userId, authId, userName, onSuccess }: Props) {
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirm]     = useState("");
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");

  const inputCls = "w-full px-5 py-4 bg-white border border-[#e8e0d8] focus:border-[#c04838] focus:ring-4 focus:ring-[#c04838]/10 rounded-xl outline-none transition-all text-[#3e2723] placeholder:text-[#3e2723]/30 pr-12 text-sm";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) { setError("Password minimal 6 karakter."); return; }
    if (newPassword !== confirmPassword) { setError("Konfirmasi password tidak cocok."); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("userId", userId);
      fd.append("authId", authId);
      fd.append("fullName", userName);
      fd.append("password", newPassword);
      fd.append("photoBase64", "");

      const result = await updateProfileAction(fd);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Gagal menyimpan password.");
      }
    } catch {
      setError("Terjadi kesalahan sistem.");
    } finally {
      setSaving(false);
    }
  };

  const strength = newPassword.length === 0 ? 0
    : newPassword.length < 6 ? 1
    : newPassword.length < 10 ? 2
    : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 4 : 3;

  const strengthLabel = ["", "Terlalu pendek", "Lemah", "Cukup", "Kuat"];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-green-500"];

  return (
    <div className="fixed inset-0 z-[200] bg-[#3e2723]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#faf8f5] px-8 pt-8 pb-6 border-b border-[#e8e0d8] text-center">
          <div className="w-14 h-14 bg-red-50 text-[#c04838] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound size={26} />
          </div>
          <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-2">Keamanan Akun</p>
          <h2 className="font-serif text-2xl font-bold text-[#3e2723]">Ganti Password Anda</h2>
          <p className="text-sm text-[#3e2723]/60 mt-2 leading-relaxed">
            Halo, <strong>{userName}</strong>. Demi keamanan, Anda wajib mengganti password sebelum menggunakan aplikasi.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          {/* Password baru */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Password Baru</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                className={inputCls}
                required
                autoFocus
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#c04838]/60 hover:text-[#c04838] transition-colors">
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* Strength bar */}
            {newPassword.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-1 flex-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength ? strengthColor[strength] : 'bg-[#e8e0d8]'}`} />
                  ))}
                </div>
                <span className="text-xs text-[#3e2723]/50">{strengthLabel[strength]}</span>
              </div>
            )}
          </div>

          {/* Konfirmasi */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Konfirmasi Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Ulangi password baru"
                className={`${inputCls} ${confirmPassword && confirmPassword !== newPassword ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                required
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#c04838]/60 hover:text-[#c04838] transition-colors">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-red-500 mt-0.5">Password tidak cocok</p>
            )}
            {confirmPassword && confirmPassword === newPassword && newPassword.length >= 6 && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                <ShieldCheck size={12} /> Password cocok
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || newPassword.length < 6 || newPassword !== confirmPassword}
            className="w-full py-4 bg-[#c04838] hover:bg-[#98382d] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(192,72,56,0.25)] mt-2"
          >
            {saving ? <><Loader2 className="animate-spin" size={18} /> Menyimpan...</> : "Simpan Password Baru"}
          </button>
        </form>
      </div>
    </div>
  );
}
