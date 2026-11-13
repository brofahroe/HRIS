"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import Image from "next/image";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-[#3e2723]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-stone-200/70 text-center flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6">
          <img
            src="/Batik Seng-01.png"
            alt="Batik Seng"
            className="h-10 object-contain mx-auto"
          />
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-red-50 text-[#c04838] flex items-center justify-center mb-6 shadow-inner">
          <WifiOff className="w-8 h-8" />
        </div>

        <h1 className="font-serif text-2xl font-bold text-[#c04838] mb-3">
          Koneksi Terputus
        </h1>

        <p className="text-sm text-[#3e2723]/70 leading-relaxed mb-6">
          Aplikasi Batik Seng HRIS sedang dalam mode offline. Pastikan perangkat Anda terhubung ke jaringan internet (Wi-Fi atau data seluler) untuk mengakses portal dan melakukan presensi.
        </p>

        <button
          onClick={handleReload}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#c04838] hover:bg-[#a0382b] text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Coba Hubungkan Kembali</span>
        </button>

        <div className="mt-6 pt-6 border-t border-stone-100 text-xs text-stone-400">
          Batik Seng HRIS &bull; Progressive Web App
        </div>
      </div>
    </div>
  );
}

