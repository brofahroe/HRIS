"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { LogOut, MapPin, Clock, Camera, CheckCircle, X } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'in' | 'out'>('in');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setSessionUser(session.user);

      const { data: userData } = await supabase
        .from('users').select('*').eq('auth_id', session.user.id).single();
        
      if (userData) {
        setProfile(userData);
        const { data: attData } = await supabase
          .from('attendance').select('*').eq('user_id', userData.id)
          .order('date', { ascending: false });
        if (attData) {
          setHistory(attData);
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
    router.push("/login");
  };

  const openCamera = async (mode: 'in' | 'out' = 'in') => {
    setCameraMode(mode);
    setShowCamera(true);
    setPhotoData(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert("Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera.");
      setShowCamera(false);
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    const MAX_WIDTH = 600;
    const scale = Math.min(1, MAX_WIDTH / videoRef.current.videoWidth);
    canvas.width = videoRef.current.videoWidth * scale;
    canvas.height = videoRef.current.videoHeight * scale;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setPhotoData(canvas.toDataURL("image/jpeg", 0.7));
      streamRef.current?.getTracks().forEach(t => t.stop());
    }
  };

  const retakePhoto = () => {
    setPhotoData(null);
    openCamera(cameraMode);
  };

  const submitAttendance = () => {
    if (!profile || !photoData) return;
    setIsCheckingIn(true);
    if (!navigator.geolocation) {
      alert("GPS tidak didukung di browser ini.");
      setIsCheckingIn(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const endpoint = cameraMode === 'out' ? '/api/attendance/check-out' : '/api/attendance/check-in';
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: profile.id, lat: latitude, lng: longitude, photoBase64: photoData, time: new Date().toISOString() })
          });
          const result = await res.json();
          if (res.ok) {
            alert(result.message);
            closeCamera();
            const { data } = await supabase.from('attendance').select('*').eq('user_id', profile.id).order('date', { ascending: false });
            if (data) {
              setHistory(data);
              const todayStr = new Date().toISOString().split('T')[0];
              const today = data.find(a => a.date === todayStr);
              if (today) setTodayAttendance(today);
            }
          } else {
            alert("Gagal Absen: " + result.error + (result.distance ? ` (Jarak Anda: ${result.distance})` : ''));
          }
        } catch { alert("Terjadi kesalahan jaringan."); }
        finally { setIsCheckingIn(false); }
      },
      () => { alert("Gagal mendapatkan lokasi. Pastikan GPS menyala."); setIsCheckingIn(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCheckIn = () => { if (!profile || !photoData) return; setCameraMode('in'); submitAttendance(); };
  const handleCheckOut = () => { if (!profile || !photoData) return; setCameraMode('out'); submitAttendance(); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5] text-[#3e2723]/60">
        Memuat data Anda...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <header className="bg-white border-b border-[#e8e0d8] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/dashboard/profile" className="flex items-center gap-3 group hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-red-50 text-[#c04838] flex items-center justify-center font-bold overflow-hidden border-2 border-red-100 group-hover:border-[#c04838]/30 transition-colors text-sm">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0) || "U"
            )}
          </div>
          <div>
            <h1 className="font-bold text-[#3e2723] leading-tight">{profile?.full_name || "Memuat..."}</h1>
            <p className="text-xs text-[#3e2723]/50">{profile?.position || "Karyawan"}</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <img src="/Batik Seng-02.png" alt="Batik Seng" className="w-7 h-7 object-contain" />
            <span className="font-bold text-[#c04838] text-sm">Batik Seng</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-[#3e2723]/40 hover:text-[#c04838] hover:bg-red-50 rounded-lg transition-colors"
            title="Keluar"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
        {/* Attendance Card */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-[0_4px_20px_rgba(192,72,56,0.06)] border border-red-50 flex flex-col items-center py-10">
          <div className="text-center mb-8">
            <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-2">Jadwal Hari Ini</p>
            <div className="font-serif text-5xl font-bold text-[#3e2723] tracking-tight mb-2">08:00 – 17:00</div>
            <p className="text-sm text-[#3e2723]/50 flex items-center justify-center gap-1">
              <MapPin size={14} /> Galeri / Sanggar Batik
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-2">
            {todayAttendance ? (
              <>
                <button disabled className="flex-1 py-4 bg-green-50 text-green-700 border border-green-200 rounded-2xl font-semibold flex flex-col items-center gap-1 text-sm">
                  <CheckCircle size={22} className="text-green-500" />
                  Sudah Absen ({new Date(todayAttendance.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                </button>
                {!todayAttendance.check_out_time ? (
                  <button
                    onClick={() => openCamera('out')}
                    disabled={isCheckingIn}
                    className="flex-1 py-4 bg-[#3e2723] hover:bg-[#2a1a17] active:scale-95 disabled:opacity-70 text-white rounded-2xl font-semibold shadow-lg flex flex-col items-center gap-1 text-sm transition-all"
                  >
                    <Camera size={22} />
                    Check Out (Selfie)
                  </button>
                ) : (
                  <button disabled className="flex-1 py-4 bg-[#faf8f5] text-[#3e2723]/50 border border-[#e8e0d8] rounded-2xl font-semibold flex flex-col items-center gap-1 text-sm">
                    <CheckCircle size={22} className="text-[#3e2723]/40" />
                    Sudah Check Out ({new Date(todayAttendance.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => openCamera('in')}
                disabled={isCheckingIn}
                className="flex-1 py-4 bg-[#c04838] hover:bg-[#98382d] active:scale-95 disabled:opacity-70 transition-all text-white rounded-2xl font-bold shadow-[0_8px_20px_rgba(192,72,56,0.25)] flex flex-col items-center gap-1"
              >
                <Camera size={22} />
                Check In (Selfie)
              </button>
            )}
          </div>

          {/* Face ID Banner */}
          <div className="mt-6 w-full max-w-sm">
            {!profile?.face_descriptor ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-sm text-amber-800 mb-3 text-center">Anda belum mendaftarkan wajah (Face ID). Wajib didaftarkan untuk absen.</p>
                <Link href="/dashboard/face-registration" className="block w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-center rounded-xl font-bold transition-all shadow-md text-sm">
                  Daftarkan Wajah Sekarang
                </Link>
              </div>
            ) : (
              <Link href="/dashboard/face-registration" className="block w-full py-3 bg-[#faf8f5] hover:bg-[#f0ebe4] text-[#3e2723]/60 text-center rounded-xl font-semibold transition-all border border-[#e8e0d8] text-sm">
                Perbarui Data Wajah (Face ID)
              </Link>
            )}
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(192,72,56,0.04)] border border-[#e8e0d8] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e8e0d8]">
            <h3 className="font-bold text-[#3e2723]">Riwayat Absensi Terakhir</h3>
          </div>
          <div className="divide-y divide-[#f0ebe4]">
            {history.length === 0 ? (
              <div className="p-8 text-center text-[#3e2723]/40">Belum ada riwayat absensi.</div>
            ) : (
              history.slice(0, 7).map((att) => (
                <div key={att.id} className="p-4 px-6 flex justify-between items-center hover:bg-[#faf8f5]">
                  <div className="flex items-center gap-4">
                    {att.check_in_photo && (
                      <img src={att.check_in_photo} alt="Selfie" className="w-11 h-11 rounded-xl object-cover bg-[#faf8f5]" />
                    )}
                    <div>
                      <p className="font-medium text-[#3e2723] text-sm">
                        {new Date(att.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-xs text-[#3e2723]/50 flex items-center gap-1 mt-0.5">
                        <Clock size={12} />
                        {new Date(att.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    att.status === 'Hadir' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {att.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-[#3e2723]/80 z-[100] flex flex-col items-center justify-center p-4">
          <button onClick={closeCamera} className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors">
            <X size={24} />
          </button>
          <div className="w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 text-center border-b border-[#e8e0d8]">
              <h3 className="font-bold text-[#3e2723]">{cameraMode === 'in' ? 'Selfie Check-In' : 'Selfie Check-Out'}</h3>
              <p className="text-xs text-[#3e2723]/50 mt-0.5">Pastikan wajah terlihat jelas</p>
            </div>
            <div className="relative bg-[#3e2723] aspect-[3/4] w-full flex items-center justify-center overflow-hidden">
              {!photoData ? (
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />
              ) : (
                <img src={photoData} alt="Captured" className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />
              )}
            </div>
            <div className="p-6 bg-white flex flex-col gap-3">
              {!photoData ? (
                <button onClick={capturePhoto} className="w-full py-4 bg-[#c04838] hover:bg-[#98382d] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(192,72,56,0.25)]">
                  <Camera size={20} /> Ambil Foto
                </button>
              ) : (
                <>
                  <button
                    onClick={cameraMode === 'in' ? handleCheckIn : handleCheckOut}
                    disabled={isCheckingIn}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    {isCheckingIn ? "Mendeteksi Lokasi GPS..." : cameraMode === 'in' ? "Kirim Check-In" : "Kirim Check-Out"}
                  </button>
                  <button onClick={retakePhoto} disabled={isCheckingIn} className="w-full py-3 bg-[#faf8f5] hover:bg-[#f0ebe4] text-[#3e2723] rounded-xl font-semibold border border-[#e8e0d8]">
                    Ulangi Foto
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
