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
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Ambil Total Karyawan
        const { count: totalEmployees } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'Employee')
          .eq('is_active', true);

        // 2. Ambil Absensi Hari Ini
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: todayAttendance } = await supabase
          .from('attendance')
          .select('*, users(full_name)')
          .eq('date', todayStr)
          .order('check_in_time', { ascending: false });

        let present = 0;
        let late = 0;
        let leave = 0;

        if (todayAttendance) {
          todayAttendance.forEach(att => {
            if (att.status === 'Hadir') present++;
            if (att.status === 'Terlambat') late++;
            if (att.status === 'Cuti' || att.status === 'Izin' || att.status === 'Sakit') leave++;
          });
          setRecentActivity(todayAttendance.slice(0, 10)); // 10 aktivitas terbaru
        }

        setStats({
          totalEmployees: totalEmployees || 0,
          presentToday: present,
          lateToday: late,
          onLeave: leave
        });
      } catch (err) {
        console.error("Gagal mengambil data dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Ikhtisar Hari Ini</h2>
        <p className="text-slate-500">Ringkasan aktivitas karyawan Anda secara real-time.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Karyawan Aktif</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.totalEmployees}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Hadir Tepat Waktu</p>
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
            <p className="text-sm font-medium text-slate-500">Cuti / Izin / Sakit</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.onLeave}</h3>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Aktivitas Absensi Terbaru (Hari Ini)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="px-6 py-3 font-medium">Karyawan</th>
                <th className="px-6 py-3 font-medium">Waktu Check-In</th>
                <th className="px-6 py-3 font-medium">Foto Selfie</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Belum ada karyawan yang absen hari ini.</td>
                </tr>
              ) : (
                recentActivity.map(att => (
                  <tr key={att.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {att.users?.full_name || 'Karyawan'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(att.check_in_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-6 py-4">
                      {att.check_in_photo ? (
                        <img src={att.check_in_photo} alt="Selfie" className="w-10 h-10 rounded-lg object-cover bg-slate-200" />
                      ) : (
                        <span className="text-xs text-slate-400">Tidak ada foto</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        att.status === 'Hadir' ? 'bg-green-100 text-green-800' : 
                        att.status === 'Terlambat' ? 'bg-amber-100 text-amber-800' : 
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {att.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
