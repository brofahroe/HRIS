"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, Clock, FileWarning } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    onLeave: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Dalam implementasi nyata, ini akan memanggil Supabase
      // Untuk demo, kita gunakan data dummy
      setStats({
        totalEmployees: 45,
        presentToday: 42,
        lateToday: 5,
        onLeave: 2
      });
    };
    
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Ikhtisar Hari Ini</h2>
        <p className="text-slate-500">Ringkasan aktivitas karyawan Anda.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Karyawan</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.totalEmployees}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Hadir</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.presentToday}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Terlambat</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.lateToday}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <FileWarning size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Cuti / Izin</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.onLeave}</h3>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Aktivitas Absensi Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="px-6 py-3 font-medium">Karyawan</th>
                <th className="px-6 py-3 font-medium">Waktu</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Lokasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">Budi Santoso</td>
                <td className="px-6 py-4 text-slate-600">07:45 AM</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Tepat Waktu
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 text-sm">Kantor Pusat</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">Siti Aminah</td>
                <td className="px-6 py-4 text-slate-600">08:15 AM</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Terlambat
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 text-sm">Cabang Sudirman</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
