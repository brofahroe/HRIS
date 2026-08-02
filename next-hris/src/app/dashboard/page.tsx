"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User, LogOut, MapPin, Clock, Camera, CheckCircle } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setSessionUser(session.user);

      // Ambil profil public.users
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();
        
      if (userData) {
        setProfile(userData);
        
        // Ambil riwayat absen
        const { data: attData } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userData.id)
          .order('date', { ascending: false });
          
        if (attData) {
          setHistory(attData);
          // Cek absen hari ini
          const todayStr = new Date().toISOString().split('T')[0];
          const today = attData.find(a => a.date === todayStr);
          if (today) setTodayAttendance(today);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleCheckIn = () => {
    if (!profile) return;
    setIsCheckingIn(true);

    if (!navigator.geolocation) {
      alert("GPS tidak didukung di browser ini.");
      setIsCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch('/api/attendance/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profile.id, // ID dari public.users
              lat: latitude,
              lng: longitude,
              time: new Date().toISOString()
            })
          });
          
          const result = await res.json();
          if (res.ok) {
            alert(result.message);
            // Refresh riwayat
            const { data } = await supabase
              .from('attendance')
              .select('*')
              .eq('user_id', profile.id)
              .order('date', { ascending: false });
            if (data) {
              setHistory(data);
              const todayStr = new Date().toISOString().split('T')[0];
              const today = data.find(a => a.date === todayStr);
              if (today) setTodayAttendance(today);
            }
          } else {
            alert("Gagal Absen: " + result.error + (result.distance ? ` (Jarak Anda: ${result.distance})` : ''));
          }
        } catch (err) {
          alert("Terjadi kesalahan jaringan.");
        } finally {
          setIsCheckingIn(false);
        }
      },
      (error) => {
        alert("Gagal mendapatkan lokasi. Pastikan GPS menyala dan izin lokasi diberikan ke browser.");
        setIsCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Memuat data Anda...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
            {profile?.full_name?.charAt(0) || sessionUser?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">{profile?.full_name || sessionUser?.email}</h2>
            <p className="text-xs text-slate-500">{profile?.position || 'Karyawan'}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col items-center py-10">
          <div className="text-center mb-8">
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Jadwal Hari Ini</h3>
            <div className="text-5xl font-extrabold text-blue-900 tracking-tight mb-2">08:00 - 17:00</div>
            <p className="text-sm text-slate-500 flex items-center justify-center gap-1">
              <MapPin size={16} /> Galeri / Sanggar Batik
            </p>
          </div>

          <div className="flex gap-4 w-full max-w-sm">
            {todayAttendance ? (
              <button disabled className="flex-1 py-4 bg-green-50 text-green-700 border border-green-200 rounded-2xl font-semibold flex flex-col items-center gap-1">
                <CheckCircle size={24} className="text-green-500" />
                Sudah Absen ({new Date(todayAttendance.check_in_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})})
              </button>
            ) : (
              <button 
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-70 disabled:scale-100 transition-all text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 flex flex-col items-center gap-1"
              >
                <Camera size={24} />
                {isCheckingIn ? "Mendeteksi Lokasi..." : "Check In Sekarang"}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Riwayat Absensi Terakhir</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Belum ada riwayat absensi.</div>
            ) : (
              history.slice(0, 7).map((att) => (
                <div key={att.id} className="p-4 px-6 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-800">{new Date(att.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock size={14} /> 
                      {new Date(att.check_in_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      att.status === 'Hadir' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {att.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
