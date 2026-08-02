"use client";

import { useState } from "react";
import { Download, Calculator, FileText } from "lucide-react";
import { processPayrollAction } from "./actions";

export default function PayrollPage() {
  const [loading, setLoading] = useState(false);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleGenerate = async () => {
    setLoading(true);
    const res = await processPayrollAction(selectedYear, selectedMonth);
    setLoading(false);
    
    if (res.success) {
      setPayrollData(res.data);
      alert(`Berhasil menghitung gaji untuk ${res.data.length} karyawan!`);
    } else {
      alert("Gagal memproses gaji: " + res.error);
    }
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manajemen Payroll</h2>
          <p className="text-slate-500">Kalkulasi dan kelola penggajian karyawan bulanan.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
          >
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Bulan {m}</option>
            ))}
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
          
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            {loading ? "Memproses..." : <><Calculator size={18} /> Kalkulasi Gaji</>}
          </button>
        </div>
      </div>

      {payrollData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center mt-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Belum Ada Data Gaji</h3>
          <p className="text-slate-500 max-w-md">
            Pilih bulan dan tahun di atas, lalu klik "Kalkulasi Gaji" untuk menghitung kehadiran dan total gaji secara otomatis.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
          <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-700">Laporan Penggajian (Bulan {selectedMonth}/{selectedYear})</h3>
            <button className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Download size={16} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white text-slate-500 text-sm border-b border-slate-100">
                  <th className="px-6 py-3 font-medium">Karyawan</th>
                  <th className="px-6 py-3 font-medium text-center">Kehadiran</th>
                  <th className="px-6 py-3 font-medium text-right">Gaji Pokok</th>
                  <th className="px-6 py-3 font-medium text-right">Tunjangan</th>
                  <th className="px-6 py-3 font-medium text-right text-red-500">Potongan</th>
                  <th className="px-6 py-3 font-medium text-right text-blue-600">Total Diterima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollData.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{p.employee_name}</div>
                      <div className="text-xs text-slate-500">NIK: {p.nik}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-semibold text-green-600">{p.present_days} Hadir</div>
                      <div className="text-xs text-amber-500">{p.late_days > 0 ? `${p.late_days} Terlambat` : ''}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700">{formatRupiah(p.base_salary)}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{formatRupiah(p.total_allowance)}</td>
                    <td className="px-6 py-4 text-right text-red-500">-{formatRupiah(p.late_deductions)}</td>
                    <td className="px-6 py-4 text-right font-bold text-blue-700">{formatRupiah(p.net_salary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
