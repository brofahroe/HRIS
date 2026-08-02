"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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

  // 1. Ambil Profil User
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();
      
      if (userData) {
        setProfile(userData);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [router]);

  // 2. Inisialisasi face-api.js dari CDN (di-trigger oleh onReady di Script)
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
    } catch (err) {
      console.error("Gagal memuat model face-api:", err);
      alert("Gagal memuat model pendeteksi wajah. Pastikan koneksi internet stabil.");
    }
  };

  // 3. Mulai Webcam
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Gagal mengakses kamera. Mohon berikan izin kamera.");
    }
  };

  // 4. Deteksi Wajah Secara Berkala (Looping)
  const handleVideoPlay = () => {
    setInterval(async () => {
      if (videoRef.current && modelsLoaded && !registrationSuccess) {
        // @ts-ignore
        const detections = await faceapi.detectSingleFace(
          videoRef.current, 
          // @ts-ignore
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptor();

        if (detections) {
          setFaceDetected(true);
        } else {
          setFaceDetected(false);
        }
      }
    }, 500);
  };

  // 5. Daftarkan Wajah
  const registerFace = async () => {
    if (!videoRef.current || !profile) return;
    setIsRegistering(true);

    try {
      // Ambil descriptor saat tombol diklik
      // @ts-ignore
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        // @ts-ignore
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        alert("Wajah tidak terdeteksi jelas. Mohon posisikan wajah di tengah dan hadap kamera.");
        setIsRegistering(false);
        return;
      }

      // Kirim array Float32 ke server
      const descriptorArray = Array.from(detection.descriptor);

      const res = await fetch('/api/attendance/register-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          faceDescriptor: descriptorArray
        })
      });

      const result = await res.json();
      if (res.ok) {
        setRegistrationSuccess(true);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      } else {
        alert("Gagal mendaftar wajah: " + result.error);
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsRegistering(false);
    }
  };

  // Bersihkan stream saat keluar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Memuat data...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Load face-api.js CDN */}
      <Script 
        src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js" 
        strategy="afterInteractive"
        onReady={() => { loadModels(); }}
      />

      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center sticky top-0 z-50">
        <Link href="/dashboard" className="mr-4 text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="font-bold text-xl text-slate-800">Pendaftaran Wajah (Face ID)</h1>
      </header>

      <main className="max-w-md mx-auto p-4 md:p-6 space-y-6 mt-4">
        {registrationSuccess ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Pendaftaran Sukses!</h2>
            <p className="text-slate-500 mb-8">Wajah Anda telah berhasil didaftarkan ke sistem dan siap digunakan untuk absensi cerdas.</p>
            
            <Link href="/dashboard" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/30 flex justify-center">
              Kembali ke Dashboard
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200 flex flex-col">
            <div className="p-4 text-center border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Pindai Wajah Anda</h3>
              <p className="text-xs text-slate-500 mt-1">
                {modelsLoaded ? "Arahkan wajah Anda lurus ke kamera" : "Sedang mengunduh model AI (Mohon tunggu)..."}
              </p>
            </div>
            
            <div className="relative bg-slate-900 aspect-[3/4] w-full flex items-center justify-center overflow-hidden">
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
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-white font-medium text-sm">Menyiapkan AI...</p>
                </div>
              )}

              {/* Face Guide Box */}
              {modelsLoaded && (
                <div className={`absolute w-48 h-56 border-2 border-dashed rounded-3xl transition-colors duration-300 ${faceDetected ? 'border-green-400 bg-green-400/10' : 'border-white/50'}`}></div>
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
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
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
