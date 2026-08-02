"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User, LogOut, MapPin, Clock, Camera, CheckCircle, X } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setSessionUser(session.user);

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();
        
      if (userData) {
        setProfile(userData);
        
        const { data: attData } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userData.id)
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
    router.push("/");
  };

  // 1. Buka Kamera
  const openCamera = async () => {
    setShowCamera(true);
    setPhotoData(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera.");
      setShowCamera(false);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  // 2. Ambil Foto (Diperkecil agar tidak berat)
  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      // Batasi resolusi maksimal 600px untuk menghemat ukuran file (mencegah error Payload Too Large)
      const MAX_WIDTH = 600;
      const scale = Math.min(1, MAX_WIDTH / videoRef.current.videoWidth);
      canvas.width = videoRef.current.videoWidth * scale;
      canvas.height = videoRef.current.videoHeight * scale;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        // Kompresi JPEG 70%
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setPhotoData(dataUrl);
        // Matikan stream setelah foto diambil
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const retakePhoto = () => {
    setPhotoData(null);
    openCamera(); // Buka stream lagi
  };

  // 3. Eksekusi Check-In dengan Foto & GPS
  const handleCheckIn = () => {
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
        try {
          const res = await fetch('/api/attendance/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profile.id,
              lat: latitude,
              lng: longitude,
              photoBase64: photoData, // Kirim foto Base64
              time: new Date().toISOString()
            })
          });
          
          const result = await res.json();
          if (res.ok) {
            alert(result.message);
            closeCamera();
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

          <div className="flex gap-4 w-full max-w-sm mt-4">
            {todayAttendance ? (
              <button disabled className="flex-1 py-4 bg-green-50 text-green-700 border border-green-200 rounded-2xl font-semibold flex flex-col items-center gap-1">
                <CheckCircle size={24} className="text-green-500" />
                Sudah Absen ({new Date(todayAttendance.check_in_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})})
              </button>
            ) : (
              <button 
                onClick={openCamera}
                disabled={isCheckingIn}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-70 disabled:scale-100 transition-all text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 flex flex-col items-center gap-1"
              >
                <Camera size={24} />
                Check In (Selfie)
              </button>
            )}
          </div>
          
          {/* Tombol Pendaftaran Wajah */}
          <div className="mt-6 w-full max-w-sm">
            {!profile?.face_descriptor ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-sm text-amber-800 mb-3 text-center">Anda belum mendaftarkan wajah (Face ID). Wajib didaftarkan untuk absen besok.</p>
                <Link href="/dashboard/face-registration" className="block w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-center rounded-xl font-bold transition-all shadow-md">
                  Daftarkan Wajah Sekarang
                </Link>
              </div>
            ) : (
              <Link href="/dashboard/face-registration" className="block w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-center rounded-xl font-semibold transition-all">
                Perbarui Data Wajah (Face ID)
              </Link>
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
                  <div className="flex items-center gap-4">
                    {att.check_in_photo && (
                      <img src={att.check_in_photo} alt="Selfie" className="w-12 h-12 rounded-lg object-cover bg-slate-200" />
                    )}
                    <div>
                      <p className="font-medium text-slate-800">{new Date(att.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Clock size={14} /> 
                        {new Date(att.check_in_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
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

      {/* MODAL KAMERA SELFIE */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4">
          <button 
            onClick={closeCamera}
            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 text-center border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Selfie Absensi</h3>
              <p className="text-xs text-slate-500">Pastikan wajah terlihat jelas</p>
            </div>
            
            <div className="relative bg-slate-900 aspect-[3/4] w-full flex items-center justify-center overflow-hidden">
              {!photoData ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" 
                />
              ) : (
                <img 
                  src={photoData} 
                  alt="Captured Selfie" 
                  className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" 
                />
              )}
            </div>
            
            <div className="p-6 bg-white flex flex-col gap-3">
              {!photoData ? (
                <button 
                  onClick={capturePhoto}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <Camera size={20} /> Ambil Foto
                </button>
              ) : (
                <>
                  <button 
                    onClick={handleCheckIn}
                    disabled={isCheckingIn}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    {isCheckingIn ? "Mendeteksi Lokasi GPS..." : "Kirim Absensi"}
                  </button>
                  <button 
                    onClick={retakePhoto}
                    disabled={isCheckingIn}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                  >
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
