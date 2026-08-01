"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User, LogOut, MapPin, Clock, Camera } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">{user?.email}</h2>
            <p className="text-xs text-slate-500">Karyawan</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 space-y-6 mt-4">
        <h1 className="text-2xl font-bold text-slate-800">Beranda</h1>

        {/* Absensi Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col items-center py-10">
          <div className="text-center mb-8">
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Jadwal Hari Ini</h3>
            <div className="text-5xl font-extrabold text-blue-900 tracking-tight mb-2">
              08:00 - 17:00
            </div>
            <p className="text-sm text-slate-500 flex items-center justify-center gap-1">
              <MapPin size={16} /> Kantor Pusat
            </p>
          </div>

          <div className="flex gap-4 w-full max-w-sm">
            <button className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 flex flex-col items-center gap-1">
              <Camera size={24} />
              Check In
            </button>
            <button className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-slate-700 rounded-2xl font-semibold flex flex-col items-center gap-1 opacity-50 cursor-not-allowed">
              <LogOut size={24} />
              Check Out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Kehadiran</p>
            <p className="text-2xl font-bold text-slate-800">14 Hari</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Terlambat</p>
            <p className="text-2xl font-bold text-amber-500">2 Hari</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Cuti Sisa</p>
            <p className="text-2xl font-bold text-green-600">8 Hari</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Lembur</p>
            <p className="text-2xl font-bold text-purple-600">12 Jam</p>
          </div>
        </div>
      </main>
    </div>
  );
}
