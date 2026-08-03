"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getAccessToken } from "@/lib/authClient";
import { getWIBDate } from "@/lib/wib";
import { LogOut, MapPin, Clock, Camera, CheckCircle, X, ClipboardList, AlertTriangle, Loader2 } from "lucide-react";
import ForceChangePassword from "@/app/components/ForceChangePassword";

type ModalStep = 'camera' | 'form';
type OvertimeStatus = 'idle' | 'pending' | 'approved' | 'rejected';

export default function DashboardPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Force change password
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Off-day / overtime state
  const [isOffDay, setIsOffDay] = useState(false);
  const [offDayLabel, setOffDayLabel] = useState('');
  const [overtimeStatus, setOvertimeStatus] = useState<OvertimeStatus>('idle');
  const [overtimeRequestId, setOvertimeRequestId] = useState<string | null>(null);
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [overtimeReason, setOvertimeReason] = useState('');
  const [submittingOvertime, setSubmittingOvertime] = useState(false);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'in' | 'out'>('in');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>('camera');
  const [workUpdate, setWorkUpdate] = useState('');
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
        if (userData.must_change_password) setMustChangePassword(true);
        const { data: attData } = await supabase
          .from('attendance').select('*').eq('user_id', userData.id)
          .order('date', { ascending: false });
        if (attData) {
          setHistory(attData);
          const todayStr = getWIBDate();
          const today = attData.find((a: any) => a.date === todayStr);
          if (today) setTodayAttendance(today);
        }

        // Cek apakah hari ini hari libur/minggu
        const todayStr = getWIBDate();
        const dow = new Date().getDay();
        let offDay = false;
        let label = '';

        if (dow === 0) { offDay = true; label = 'Hari Minggu'; }

        if (!offDay) {
          try {
            const res = await fetch(`https://titimangsa.sangkan.dev/v1/holidays/check?date=${todayStr}`);
            if (res.ok) {
              const json = await res.json();
              const data = json?.data;
              if (data?.isHoliday) {
                const national = (data.holidays ?? []).find((h: any) => h.isNationalHoliday);
                if (national) { offDay = true; label = national.localName ?? national.name; }
              }
            }
          } catch { /* fallback Minggu saja */ }
        }

        setIsOffDay(offDay);
        setOffDayLabel(label);

        // Cek status permohonan lembur hari ini (kalau off day)
        if (offDay) {
          const { data: otReq } = await supabase
            .from('overtime_requests')
            .select('id, status')
            .eq('user_id', userData.id)
            .eq('date', todayStr)
            .single();
          if (otReq) {
            setOvertimeRequestId(otReq.id);
            setOvertimeStatus(otReq.status as OvertimeStatus);
          }
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

  // Submit permohonan lembur
  const handleOvertimeSubmit = async () => {
    if (!profile || !overtimeReason.trim()) return;
    setSubmittingOvertime(true);
    const todayStr = getWIBDate();
    try {
      const token = await getAccessToken();
      if (!token) { alert("Sesi habis. Silakan login ulang."); setSubmittingOvertime(false); return; }
      const res = await fetch('/api/overtime/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ date: todayStr, reason: overtimeReason }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setOvertimeRequestId(result.data.id);
        setOvertimeStatus(result.data.status as OvertimeStatus);
        setShowOvertimeForm(false);
        alert(result.message);
      } else {
        alert(result.error || 'Gagal mengajukan permohonan.');
      }
    } catch { alert('Terjadi kesalahan jaringan.'); }
    finally { setSubmittingOvertime(false); }
  };

  const openCamera = async (mode: 'in' | 'out' = 'in') => {
    setCameraMode(mode);
    setShowCamera(true);
    setPhotoData(null);
    setModalStep('camera');
    setWorkUpdate('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert("Gagal mengakses kamera.");
      setShowCamera(false);
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setShowCamera(false);
    setPhotoData(null);
    setModalStep('camera');
    setWorkUpdate('');
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

  const retakePhoto = () => { setPhotoData(null); setModalStep('camera'); openCamera(cameraMode); };

  const handlePhotoCaptured = () => {
    if (cameraMode === 'in') submitAttendance();
    else setModalStep('form');
  };

  const submitAttendance = async (extraWorkUpdate?: string) => {
    if (!profile || !photoData) return;
    setIsCheckingIn(true);
    const token = await getAccessToken();
    if (!token) { alert("Sesi habis. Silakan login ulang."); setIsCheckingIn(false); return; }
    if (!navigator.geolocation) {
      alert("GPS tidak didukung."); setIsCheckingIn(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const endpoint = cameraMode === 'out' ? '/api/attendance/check-out' : '/api/attendance/check-in';
        const update = extraWorkUpdate ?? workUpdate;
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              lat: latitude, lng: longitude,
              photoBase64: photoData,
              ...(cameraMode === 'out' && { workUpdate: update }),
              ...(cameraMode === 'in' && isOffDay && overtimeRequestId && { overtimeRequestId }),
            })
          });
          const result = await res.json();
          if (res.ok) {
            alert(result.message);
            closeCamera();
            const { data } = await supabase.from('attendance').select('*').eq('user_id', profile.id).order('date', { ascending: false });
            if (data) {
              setHistory(data);
              const todayStr = getWIBDate();
              const today = data.find((a: any) => a.date === todayStr);
              if (today) setTodayAttendance(today);
            }
          } else {
            alert("Gagal Absen: " + result.error + (result.distance ? ` (${result.distance})` : ''));
          }
        } catch { alert("Terjadi kesalahan jaringan."); }
        finally { setIsCheckingIn(false); }
      },
      () => { alert("Gagal mendapatkan lokasi GPS."); setIsCheckingIn(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCheckOut = () => {
    if (!workUpdate.trim()) { alert("Mohon isi update kerja hari ini."); return; }
    submitAttendance(workUpdate);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5] text-[#3e2723]/60">
        Memuat data Anda...
      </div>
    );
  }

  const todayStr = getWIBDate();

  // Apakah boleh check-in hari ini?
  // - Hari biasa: selalu boleh
  // - Hari libur/Minggu: hanya boleh jika lembur sudah approved
  const canCheckIn = !isOffDay || overtimeStatus === 'approved';

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <header className="bg-white border-b border-[#e8e0d8] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/dashboard/profile" className="flex items-center gap-3 group hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-red-50 text-[#c04838] flex items-center justify-center font-bold overflow-hidden border-2 border-red-100 group-hover:border-[#c04838]/30 transition-colors text-sm">
            {profile?.photo_url
              ? <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
              : profile?.full_name?.charAt(0) || "U"}
          </div>
          <div>
            <h1 className="font-bold text-[#3e2723] leading-tight">{profile?.full_name || "Memuat..."}</h1>
            <p className="text-xs text-[#3e2723]/50">{profile?.position || "Karyawan"}</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <img src="/Batik Seng-02.png" alt="Batik Seng" className="w-7 h-7 object-contain" />
            <span className="font-bold text-[#c04838] text-sm">Batik Seng</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-[#3e2723]/40 hover:text-[#c04838] hover:bg-red-50 rounded-lg transition-colors" title="Keluar">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">

        {/* Banner Hari Libur/Minggu */}
        {isOffDay && (
          <div className={`rounded-2xl p-4 border flex flex-col gap-3 ${
            overtimeStatus === 'approved' ? 'bg-green-50 border-green-200' :
            overtimeStatus === 'rejected' ? 'bg-red-50 border-red-200' :
            'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className={`shrink-0 mt-0.5 ${
                overtimeStatus === 'approved' ? 'text-green-600' :
                overtimeStatus === 'rejected' ? 'text-red-500' : 'text-amber-600'
              }`} />
              <div>
                <p className="font-semibold text-sm text-[#3e2723]">
                  {offDayLabel || 'Hari Libur'} — Hari tidak masuk kerja
                </p>
                <p className="text-xs text-[#3e2723]/60 mt-0.5">
                  {overtimeStatus === 'idle' && 'Untuk bekerja hari ini, ajukan permohonan lembur terlebih dahulu.'}
                  {overtimeStatus === 'pending' && 'Permohonan lembur Anda sedang menunggu persetujuan admin.'}
                  {overtimeStatus === 'approved' && 'Lembur disetujui. Anda dapat melakukan check-in.'}
                  {overtimeStatus === 'rejected' && 'Permohonan lembur ditolak. Anda tidak dapat check-in hari ini.'}
                </p>
              </div>
            </div>
            {overtimeStatus === 'idle' && (
              <button
                onClick={() => setShowOvertimeForm(true)}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
              >
                Ajukan Permohonan Lembur
              </button>
            )}
            {overtimeStatus === 'pending' && (
              <div className="flex items-center gap-2 text-amber-700 text-xs font-medium">
                <Loader2 size={13} className="animate-spin" /> Menunggu konfirmasi admin...
              </div>
            )}
          </div>
        )}

        {/* Attendance Card */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-[0_4px_20px_rgba(192,72,56,0.06)] border border-red-50 flex flex-col items-center py-10">
          <div className="text-center mb-8">
            <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-2">Jadwal Hari Ini</p>
            <div className="font-serif text-5xl font-bold text-[#3e2723] tracking-tight mb-2">08:00 – 16:00</div>
            <p className="text-sm text-[#3e2723]/50 flex items-center justify-center gap-1">
              <MapPin size={14} /> Galeri / Sanggar Batik
            </p>
            {isOffDay && overtimeStatus === 'approved' && (
              <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                ✓ Lembur Disetujui
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-2">
            {todayAttendance ? (
              <>
                <button disabled className="flex-1 py-4 bg-green-50 text-green-700 border border-green-200 rounded-2xl font-semibold flex flex-col items-center gap-1 text-sm">
                  <CheckCircle size={22} className="text-green-500" />
                  Sudah Absen ({new Date(todayAttendance.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                </button>
                {!todayAttendance.check_out_time ? (
                  <button onClick={() => openCamera('out')} disabled={isCheckingIn}
                    className="flex-1 py-4 bg-[#3e2723] hover:bg-[#2a1a17] active:scale-95 disabled:opacity-70 text-white rounded-2xl font-semibold shadow-lg flex flex-col items-center gap-1 text-sm transition-all">
                    <Camera size={22} /> Check Out (Selfie)
                  </button>
                ) : (
                  <button disabled className="flex-1 py-4 bg-[#faf8f5] text-[#3e2723]/50 border border-[#e8e0d8] rounded-2xl font-semibold flex flex-col items-center gap-1 text-sm">
                    <CheckCircle size={22} className="text-[#3e2723]/40" />
                    Sudah Check Out ({new Date(todayAttendance.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                  </button>
                )}
              </>
            ) : canCheckIn ? (
              <button onClick={() => openCamera('in')} disabled={isCheckingIn}
                className="flex-1 py-4 bg-[#c04838] hover:bg-[#98382d] active:scale-95 disabled:opacity-70 transition-all text-white rounded-2xl font-bold shadow-[0_8px_20px_rgba(192,72,56,0.25)] flex flex-col items-center gap-1">
                <Camera size={22} /> Check In (Selfie)
              </button>
            ) : (
              <button disabled className="flex-1 py-4 bg-[#faf8f5] text-[#3e2723]/30 border border-[#e8e0d8] rounded-2xl font-semibold flex flex-col items-center gap-1 text-sm cursor-not-allowed">
                <Camera size={22} />
                {overtimeStatus === 'pending' ? 'Menunggu Persetujuan Lembur' :
                 overtimeStatus === 'rejected' ? 'Lembur Ditolak' : 'Ajukan Lembur Dahulu'}
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

        {/* Riwayat Absensi */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(192,72,56,0.04)] border border-[#e8e0d8] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e8e0d8]">
            <h3 className="font-bold text-[#3e2723]">Riwayat Absensi Terakhir</h3>
          </div>
          <div className="divide-y divide-[#f0ebe4]">
            {history.length === 0 ? (
              <div className="p-8 text-center text-[#3e2723]/40">Belum ada riwayat absensi.</div>
            ) : (
              history.slice(0, 7).map((att) => (
                <div key={att.id} className="p-4 px-6 hover:bg-[#faf8f5] transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                      {att.check_in_photo && (
                        <img src={att.check_in_photo} alt="Selfie" className="w-11 h-11 rounded-xl object-cover bg-[#faf8f5] shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-[#3e2723] text-sm">
                          {new Date(att.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-xs text-[#3e2723]/50 flex items-center gap-1 mt-0.5">
                          <Clock size={12} />
                          {new Date(att.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          {att.check_out_time && <> – {new Date(att.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        att.status === 'Hadir' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{att.status}</span>
                      {att.is_overtime && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          Lembur {att.overtime_hours ? `${att.overtime_hours}j` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {att.work_update && (
                    <div className="mt-3 flex items-start gap-2 bg-[#faf8f5] rounded-xl p-3 border border-[#e8e0d8]">
                      <ClipboardList size={14} className="text-[#c04838] mt-0.5 shrink-0" />
                      <p className="text-xs text-[#3e2723]/70 leading-relaxed">{att.work_update}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ===== OVERTIME REQUEST MODAL ===== */}
      {showOvertimeForm && (
        <div className="fixed inset-0 bg-[#3e2723]/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-[#e8e0d8]">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#3e2723]">Permohonan Lembur</h3>
                <p className="text-xs text-[#3e2723]/50 mt-0.5">{offDayLabel} — {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <button onClick={() => setShowOvertimeForm(false)} className="text-[#3e2723]/40 hover:text-[#c04838] transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                Hari ini adalah hari libur. Untuk bekerja, ajukan permohonan lembur. Jam lembur akan dihitung <strong>2× jam kerja aktual</strong> setelah disetujui admin.
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Alasan Lembur</label>
                <textarea
                  value={overtimeReason}
                  onChange={e => setOvertimeReason(e.target.value)}
                  placeholder="Contoh: Menyelesaikan pesanan mendesak 200 pcs untuk acara hari Senin..."
                  rows={4}
                  className="w-full px-4 py-3 border border-[#e8e0d8] focus:border-[#c04838] focus:ring-4 focus:ring-[#c04838]/10 rounded-2xl outline-none text-[#3e2723] text-sm placeholder:text-[#3e2723]/30 resize-none leading-relaxed transition-all"
                  autoFocus
                />
                <p className="text-xs text-[#3e2723]/40">{overtimeReason.length} karakter</p>
              </div>
              <button
                onClick={handleOvertimeSubmit}
                disabled={submittingOvertime || overtimeReason.trim().length < 10}
                className="w-full py-4 bg-[#c04838] hover:bg-[#98382d] disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(192,72,56,0.25)] transition-all"
              >
                {submittingOvertime ? <><Loader2 size={18} className="animate-spin" /> Mengajukan...</> : 'Ajukan Permohonan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CAMERA / FORM MODAL ===== */}
      {showCamera && (
        <div className="fixed inset-0 bg-[#3e2723]/80 z-[100] flex flex-col items-center justify-center p-4">
          <button onClick={closeCamera} className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors">
            <X size={24} />
          </button>
          <div className="w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
            {modalStep === 'camera' && (
              <>
                <div className="p-4 text-center border-b border-[#e8e0d8]">
                  <h3 className="font-bold text-[#3e2723]">{cameraMode === 'in' ? 'Selfie Check-In' : 'Selfie Check-Out'}</h3>
                  {cameraMode === 'in' && isOffDay && (
                    <p className="text-xs text-purple-600 font-semibold mt-0.5">Mode Lembur — {offDayLabel}</p>
                  )}
                  <p className="text-xs text-[#3e2723]/50 mt-0.5">Pastikan wajah terlihat jelas</p>
                </div>
                <div className="relative bg-[#3e2723] aspect-[3/4] w-full overflow-hidden">
                  {!photoData
                    ? <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />
                    : <img src={photoData} alt="Captured" className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />}
                </div>
                <div className="p-6 bg-white flex flex-col gap-3">
                  {!photoData ? (
                    <button onClick={capturePhoto} className="w-full py-4 bg-[#c04838] hover:bg-[#98382d] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(192,72,56,0.25)]">
                      <Camera size={20} /> Ambil Foto
                    </button>
                  ) : (
                    <>
                      <button onClick={handlePhotoCaptured} disabled={isCheckingIn}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                        {isCheckingIn ? "Mendeteksi Lokasi GPS..." : cameraMode === 'in' ? "Kirim Check-In" : "Lanjut — Isi Update Kerja →"}
                      </button>
                      <button onClick={retakePhoto} disabled={isCheckingIn} className="w-full py-3 bg-[#faf8f5] hover:bg-[#f0ebe4] text-[#3e2723] rounded-xl font-semibold border border-[#e8e0d8] text-sm">
                        Ulangi Foto
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            {modalStep === 'form' && (
              <>
                <div className="p-4 text-center border-b border-[#e8e0d8]">
                  <h3 className="font-bold text-[#3e2723]">Update Kerja Hari Ini</h3>
                  <p className="text-xs text-[#3e2723]/50 mt-0.5">Ceritakan apa yang dikerjakan hari ini</p>
                </div>
                <div className="px-6 pt-5 flex items-center gap-3">
                  {photoData && <img src={photoData} alt="Selfie" className="w-12 h-12 rounded-xl object-cover transform -scale-x-100 border border-[#e8e0d8]" />}
                  <div>
                    <p className="text-xs font-semibold text-[#3e2723]">Foto check-out tersimpan</p>
                    <button onClick={() => setModalStep('camera')} className="text-xs text-[#c04838] hover:underline mt-0.5">Ganti foto</button>
                  </div>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <textarea value={workUpdate} onChange={e => setWorkUpdate(e.target.value)}
                    placeholder="Contoh: Menyelesaikan motif batik parang untuk pesanan 50 pcs..."
                    rows={5}
                    className="w-full px-4 py-3 border border-[#e8e0d8] focus:border-[#c04838] focus:ring-4 focus:ring-[#c04838]/10 rounded-2xl outline-none text-[#3e2723] text-sm placeholder:text-[#3e2723]/30 resize-none leading-relaxed transition-all"
                    autoFocus />
                  <p className="text-xs text-[#3e2723]/40 -mt-2">{workUpdate.length} karakter</p>
                  <button onClick={handleCheckOut} disabled={isCheckingIn || workUpdate.trim().length < 10}
                    className="w-full py-4 bg-[#c04838] hover:bg-[#98382d] disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(192,72,56,0.25)] transition-all">
                    {isCheckingIn ? "Mendeteksi Lokasi GPS..." : "Kirim Check-Out"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Force Change Password Overlay */}
      {mustChangePassword && profile && (
        <ForceChangePassword
          userId={profile.id}
          authId={profile.auth_id}
          userName={profile.full_name}
          onSuccess={() => setMustChangePassword(false)}
        />
      )}
    </div>
  );
}


