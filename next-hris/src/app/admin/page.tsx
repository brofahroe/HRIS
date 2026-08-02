"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, Clock, FileWarning, ClipboardList } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, lateToday: 0, onLeave: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { count: totalEmployees } = await supabase
          .from('users').select('*', { count: 'exact', head: true })
          .eq('role', 'Employee').eq('is_active', true);

        const todayStr = new Date().toISOString().split('T')[0];
        const { data: todayAttendance } = await supabase
          .from('attendance').select('*, users(full_name)')
          .eq('date', todayStr).order('check_in_time', { ascending: false });

        let present = 0, late = 0, leave = 0;
        if (todayAttendance) {
          todayAttendance.forEach(att => {
            if (att.status === 'Hadir') present++;
            if (att.status === 'Terlambat') late++;
            if (['Cuti', 'Izin', 'Sakit'].includes(att.status)) leave++;
          });
          setRecentActivity(todayAttendance.slice(0, 10));
        }
        setStats({ totalEmployees: totalEmployees || 0, presentToday: present, lateToday: late, onLeave: leave });
      } catch (err) {
        console.error("Gagal mengambil data dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-[#3e2723]/40">Memuat data...</div>;
  }

  const kpiCards = [
    { label: "Total Karyawan Aktif", value: stats.totalEmployees, icon: Users, color: "bg-red-50 text-[#c04838]" },
    { label: "Hadir Tepat Waktu", value: stats.presentToday, icon: UserCheck, color: "bg-green-50 text-green-600" },
    { label: "Terlambat", value: stats.lateToday, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Cuti / Izin / Sakit", value: stats.onLeave, icon: FileWarning, color: "bg-[#faf8f5] text-[#3e2723]/60" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-1">Ringkasan</p>
        <h2 className="font-serif text-3xl font-bold text-[#3e2723]">Ikhtisar Hari Ini</h2>
        <p className="text-[#3e2723]/50 mt-1 text-sm">Aktivitas karyawan Anda secara real-time.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white p-6 rounded-2xl border border-[#e8e0d8] shadow-[0_2px_12px_rgba(192,72,56,0.04)] flex items-start gap-4">
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#3e2723]/50 leading-tight">{label}</p>
              <h3 className="font-serif text-3xl font-bold text-[#3e2723] mt-0.5">{value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-2xl border border-[#e8e0d8] shadow-[0_2px_12px_rgba(192,72,56,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e8e0d8]">
          <h3 className="font-bold text-[#3e2723]">Aktivitas Absensi Terbaru (Hari Ini)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf8f5] text-[#3e2723]/50 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-3">Karyawan</th>
                <th className="px-6 py-3">Check-In / Out</th>
                <th className="px-6 py-3">Foto</th>
                <th className="px-6 py-3">Update Kerja</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe4]">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[#3e2723]/40">
                    Belum ada karyawan yang absen hari ini.
                  </td>
                </tr>
              ) : (
                recentActivity.map(att => (
                  <tr key={att.id} className="hover:bg-[#faf8f5] transition-colors align-top">
                    <td className="px-6 py-4 font-medium text-[#3e2723] text-sm">
                      {att.users?.full_name || 'Karyawan'}
                    </td>
                    <td className="px-6 py-4 text-[#3e2723]/60 text-xs">
                      <div>Masuk: {new Date(att.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      {att.check_out_time && (
                        <div className="mt-0.5">Pulang: {new Date(att.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {att.check_in_photo ? (
                        <img src={att.check_in_photo} alt="Selfie" className="w-10 h-10 rounded-lg object-cover bg-[#faf8f5]" />
                      ) : (
                        <span className="text-xs text-[#3e2723]/30">–</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      {att.work_update ? (
                        <div className="flex items-start gap-1.5">
                          <ClipboardList size={13} className="text-[#c04838] mt-0.5 shrink-0" />
                          <p className="text-xs text-[#3e2723]/70 leading-relaxed line-clamp-3">{att.work_update}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-[#3e2723]/30">Belum check-out</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        att.status === 'Hadir' ? 'bg-green-100 text-green-700' :
                        att.status === 'Terlambat' ? 'bg-amber-100 text-amber-700' :
                        'bg-[#faf8f5] text-[#3e2723]/60'
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
