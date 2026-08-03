"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getAccessToken } from "@/lib/authClient";
import { Camera, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

export default function FaceRegistrationPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: userData } = await supabase
        .from('users').select('*').eq('auth_id', session.user.id).single();
      if (userData) setProfile(userData);
      setLoading(false);
    };
    fetchProfile();
  }, [router]);

  const loadModels = async () => {
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
      // @ts-ignore
      await Promise.all([
        // @ts-ignore
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        // @ts-ignore
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        // @ts-ignore
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
      startVideo();
    } catch {
      alert("Gagal memuat model pendeteksi wajah. Pastikan koneksi internet stabil.");
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { alert("Gagal mengakses kamera. Mohon berikan izin kamera."); }
  };

  const handleVideoPlay = () => {
    setInterval(async () => {
      if (videoRef.current && modelsLoaded && !registrationSuccess) {
        // @ts-ignore
        const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks().withFaceDescriptor();
        setFaceDetected(!!detections);
      }
    }, 500);
  };

  const registerFace = async () => {
    if (!videoRef.current || !profile) return;
    setIsRegistering(true);
    try {
      // @ts-ignore
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        alert("Wajah tidak terdeteksi jelas. Mohon posisikan wajah di tengah dan hadap kamera.");
        setIsRegistering(false);
        return;
      }
      const token = await getAccessToken();
      if (!token) { alert("Sesi habis. Silakan login ulang."); setIsRegistering(false); return; }
      const descriptorArray = Array.from(detection.descriptor);
      const res = await fetch('/api/attendance/register-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ faceDescriptor: descriptorArray })
      });
      const result = await res.json();
      if (res.ok) {
        setRegistrationSuccess(true);
        streamRef.current?.getTracks().forEach(t => t.stop());
      } else {
        alert("Gagal mendaftar wajah: " + result.error);
      }
    } catch { alert("Terjadi kesalahan sistem."); }
    finally { setIsRegistering(false); }
  };

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#faf8f5] text-[#3e2723]/50">Memuat data...</div>;
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Script
        src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
        strategy="afterInteractive"
        onReady={() => { loadModels(); }}
      />

      {/* Header */}
      <header className="bg-white border-b border-[#e8e0d8] px-6 py-4 flex items-center sticky top-0 z-50">
        <Link href="/dashboard" className="mr-4 text-[#3e2723]/40 hover:text-[#c04838] transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="font-bold text-[#3e2723]">Pendaftaran Wajah (Face ID)</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 md:p-6 space-y-6 mt-4">
        {registrationSuccess ? (
          <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(192,72,56,0.06)] border border-red-50 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} />
            </div>
            <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-3">Berhasil</p>
            <h2 className="font-serif text-3xl font-bold text-[#3e2723] mb-3">Pendaftaran Sukses!</h2>
            <p className="text-[#3e2723]/60 mb-8 leading-relaxed">Wajah Anda telah berhasil didaftarkan ke sistem dan siap digunakan untuk absensi.</p>
            <Link href="/dashboard" className="w-full py-4 bg-[#c04838] hover:bg-[#98382d] text-white rounded-2xl font-bold transition-all shadow-[0_8px_20px_rgba(192,72,56,0.25)] flex justify-center">
              Kembali ke Dashboard
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(192,72,56,0.06)] border border-red-50 flex flex-col">
            <div className="p-4 text-center border-b border-[#e8e0d8] bg-[#faf8f5]">
              <h3 className="font-bold text-[#3e2723]">Pindai Wajah Anda</h3>
              <p className="text-xs text-[#3e2723]/50 mt-1">
                {modelsLoaded ? "Arahkan wajah Anda lurus ke kamera" : "Sedang mengunduh model AI (Mohon tunggu)..."}
              </p>
            </div>

            <div className="relative bg-[#3e2723] aspect-[3/4] w-full flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                onPlay={handleVideoPlay}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${!modelsLoaded && 'opacity-50 blur-sm'}`}
              />
              {!modelsLoaded && (
                <div className="absolute z-10 flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-[#c04838] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-white font-medium text-sm">Menyiapkan AI...</p>
                </div>
              )}
              {modelsLoaded && (
                <div className={`absolute w-48 h-56 border-2 border-dashed rounded-3xl transition-colors duration-300 ${faceDetected ? 'border-green-400 bg-green-400/10' : 'border-white/40'}`}></div>
              )}
            </div>

            <div className="p-6 bg-white flex flex-col gap-4">
              {!faceDetected && modelsLoaded && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl text-sm">
                  <AlertTriangle size={16} />
                  <span>Wajah belum terdeteksi. Pastikan pencahayaan cukup.</span>
                </div>
              )}
              <button
                onClick={registerFace}
                disabled={!modelsLoaded || !faceDetected || isRegistering}
                className="w-full py-4 bg-[#c04838] hover:bg-[#98382d] disabled:opacity-50 disabled:bg-[#e8e0d8] disabled:text-[#3e2723]/40 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_rgba(192,72,56,0.25)] disabled:shadow-none"
              >
                <Camera size={20} />
                {isRegistering ? "Memproses..." : "Daftarkan Wajah Saya"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
