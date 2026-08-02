"use client";

import { useState } from "react";
import { Download, Calculator } from "lucide-react";

export default function PayrollPage() {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    // Simulasi loading generate payroll
    setTimeout(() => {
      setLoading(false);
      alert("Fungsi kalkulasi gaji otomatis akan diproses oleh Server Actions (payrollEngine.ts) di sini.");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manajemen Payroll</h2>
          <p className="text-slate-500">Kalkulasi dan kelola penggajian karyawan bulanan.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
            <Download size={18} /> Export Laporan
          </button>
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            {loading ? "Memproses..." : <><Calculator size={18} /> Generate Gaji Bulan Ini</>}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
          <FileText size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Belum Ada Data Gaji Bulan Ini</h3>
        <p className="text-slate-500 max-w-md">
          Klik tombol "Generate Gaji Bulan Ini" di atas untuk secara otomatis menghitung gaji pokok, tunjangan, dan potongan absensi semua karyawan Anda.
        </p>
      </div>
    </div>
  );
}

// Temporary icon component since we forgot to import it in the top
import { FileText } from "lucide-react";
