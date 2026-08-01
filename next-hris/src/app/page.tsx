import Link from "next/link";
import { ArrowRight, Users, Clock, FileText } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-white/50 lg:p-4 shadow-sm">
          HRIS System &nbsp;
          <code className="font-bold">v2.0</code>
        </p>
      </div>

      <div className="relative flex flex-col place-items-center mt-20 md:mt-32">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-center text-blue-900 mb-6">
          Sistem HRIS Modern
        </h1>
        <p className="text-lg md:text-xl text-center text-blue-700 max-w-2xl mb-12">
          Kelola absensi, cuti, dan penggajian karyawan dengan mudah, cepat, dan aman menggunakan platform modern.
        </p>
        
        <div className="flex gap-4 mb-16">
          <Link href="/login" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
            Mulai Sekarang <ArrowRight size={20} />
          </Link>
        </div>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left gap-6">
        <div className="group rounded-2xl border border-white/40 bg-white/60 px-5 py-6 backdrop-blur-md shadow-xl transition-colors hover:bg-white">
          <h2 className="mb-3 text-2xl font-semibold flex items-center gap-2 text-blue-900">
            <Users className="text-blue-500" /> Karyawan
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-75">
            Manajemen data karyawan yang terpusat dan terorganisir.
          </p>
        </div>

        <div className="group rounded-2xl border border-white/40 bg-white/60 px-5 py-6 backdrop-blur-md shadow-xl transition-colors hover:bg-white">
          <h2 className="mb-3 text-2xl font-semibold flex items-center gap-2 text-blue-900">
            <Clock className="text-blue-500" /> Absensi
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-75">
            Check-in/out dengan validasi GPS dan foto selfie realtime.
          </p>
        </div>

        <div className="group rounded-2xl border border-white/40 bg-white/60 px-5 py-6 backdrop-blur-md shadow-xl transition-colors hover:bg-white">
          <h2 className="mb-3 text-2xl font-semibold flex items-center gap-2 text-blue-900">
            <FileText className="text-blue-500" /> Payroll
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-75">
            Perhitungan gaji otomatis terintegrasi dengan data kehadiran.
          </p>
        </div>
      </div>
    </main>
  );
}
