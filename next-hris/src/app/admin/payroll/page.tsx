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

  const formatRupiah = (angka: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

  const selectCls = "px-3 py-2.5 border border-[#e8e0d8] rounded-xl outline-none focus:border-[#c04838] focus:ring-2 focus:ring-[#c04838]/10 text-[#3e2723] text-sm bg-white transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-1">Penggajian</p>
          <h2 className="font-serif text-3xl font-bold text-[#3e2723]">Manajemen Payroll</h2>
          <p className="text-[#3e2723]/50 mt-1 text-sm">Kalkulasi dan kelola penggajian karyawan bulanan.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className={selectCls}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Bulan {m}</option>
            ))}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={selectCls}>
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-[#c04838] hover:bg-[#98382d] disabled:opacity-70 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_12px_rgba(192,72,56,0.25)] transition-colors flex items-center gap-2"
          >
            {loading ? "Memproses..." : <><Calculator size={16} /> Kalkulasi Gaji</>}
          </button>
        </div>
      </div>

      {payrollData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e8e0d8] shadow-[0_2px_12px_rgba(192,72,56,0.04)] p-14 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-red-50 text-[#c04838] rounded-2xl flex items-center justify-center mb-4">
            <FileText size={30} />
          </div>
          <h3 className="font-serif text-xl font-bold text-[#3e2723] mb-2">Belum Ada Data Gaji</h3>
          <p className="text-[#3e2723]/50 max-w-sm text-sm leading-relaxed">
            Pilih bulan dan tahun di atas, lalu klik "Kalkulasi Gaji" untuk menghitung kehadiran dan total gaji secara otomatis.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e8e0d8] shadow-[0_2px_12px_rgba(192,72,56,0.04)] overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-[#e8e0d8] bg-[#faf8f5]">
            <h3 className="font-semibold text-[#3e2723] text-sm">Laporan Penggajian (Bulan {selectedMonth}/{selectedYear})</h3>
            <button className="bg-white border border-[#e8e0d8] hover:bg-[#faf8f5] text-[#3e2723]/70 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2">
              <Download size={14} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-[#3e2723]/50 text-xs font-semibold uppercase tracking-wider border-b border-[#f0ebe4]">
                  <th className="px-6 py-3">Karyawan</th>
                  <th className="px-6 py-3 text-center">Kehadiran</th>
                  <th className="px-6 py-3 text-right">Gaji Pokok</th>
                  <th className="px-6 py-3 text-right">Tunjangan</th>
                  <th className="px-6 py-3 text-right text-[#c04838]">Potongan</th>
                  <th className="px-6 py-3 text-right text-[#3e2723]">Total Diterima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ebe4]">
                {payrollData.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[#faf8f5] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#3e2723] text-sm">{p.employee_name}</div>
                      <div className="text-xs text-[#3e2723]/40 mt-0.5">NIK: {p.nik}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-semibold text-green-600">{p.present_days} Hadir</div>
                      {p.late_days > 0 && <div className="text-xs text-amber-500">{p.late_days} Terlambat</div>}
                    </td>
                    <td className="px-6 py-4 text-right text-[#3e2723]/70 text-sm">{formatRupiah(p.base_salary)}</td>
                    <td className="px-6 py-4 text-right text-[#3e2723]/70 text-sm">{formatRupiah(p.total_allowance)}</td>
                    <td className="px-6 py-4 text-right text-[#c04838] text-sm">-{formatRupiah(p.late_deductions)}</td>
                    <td className="px-6 py-4 text-right font-bold text-[#3e2723]">{formatRupiah(p.net_salary)}</td>
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
