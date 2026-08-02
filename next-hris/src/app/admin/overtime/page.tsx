"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle, XCircle, Clock, ClipboardList, RefreshCw } from "lucide-react";

type OTStatus = "pending" | "approved" | "rejected";

const statusBadge: Record<OTStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};
const statusLabel: Record<OTStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export default function OvertimePage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | OTStatus>("pending");

  async function fetchRequests() {
    setLoading(true);
    const query = supabase
      .from("overtime_requests")
      .select("*, users(full_name, nik, position, photo_url)")
      .order("date", { ascending: false });
    const { data } = await query;
    if (data) setRequests(data);
    setLoading(false);
  }

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (requestId: string, action: "approve" | "reject") => {
    setProcessing(requestId);
    try {
      const res = await fetch("/api/overtime/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const result = await res.json();
      if (res.ok) {
        alert(result.message);
        await fetchRequests();
      } else {
        alert("Gagal: " + result.error);
      }
    } catch { alert("Terjadi kesalahan jaringan."); }
    finally { setProcessing(null); }
  };

  const filtered = filterStatus === "all"
    ? requests
    : requests.filter(r => r.status === filterStatus);

  const pendingCount = requests.filter(r => r.status === "pending").length;

  const selectCls = "px-3 py-2 border border-[#e8e0d8] rounded-xl outline-none focus:border-[#c04838] text-[#3e2723] text-sm bg-white transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-1">Manajemen</p>
          <h2 className="font-serif text-3xl font-bold text-[#3e2723]">Permohonan Lembur</h2>
          <p className="text-[#3e2723]/50 mt-1 text-sm">
            Setujui atau tolak permohonan kerja di hari libur/Minggu.
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                {pendingCount} menunggu
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className={selectCls}>
            <option value="all">Semua</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>
          <button onClick={fetchRequests} className="p-2 text-[#3e2723]/40 hover:text-[#c04838] hover:bg-red-50 rounded-xl transition-colors" title="Refresh">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-16 text-[#3e2723]/40">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e8e0d8] p-16 text-center">
          <ClipboardList size={32} className="text-[#3e2723]/20 mx-auto mb-3" />
          <p className="text-[#3e2723]/40 text-sm">Tidak ada permohonan lembur.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const isProcessing = processing === req.id;
            const att = req.attendance_info;
            return (
              <div key={req.id} className={`bg-white rounded-2xl border shadow-[0_2px_12px_rgba(192,72,56,0.04)] overflow-hidden transition-all ${
                req.status === "pending" ? "border-amber-200" : "border-[#e8e0d8]"
              }`}>
                <div className="p-5 flex flex-col sm:flex-row gap-4">
                  {/* Avatar + info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-red-50 text-[#c04838] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {req.users?.photo_url
                        ? <img src={req.users.photo_url} alt="" className="w-full h-full object-cover" />
                        : req.users?.full_name?.charAt(0) ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#3e2723] text-sm">{req.users?.full_name}</span>
                        <span className="text-xs text-[#3e2723]/40">{req.users?.nik}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[req.status as OTStatus]}`}>
                          {statusLabel[req.status as OTStatus]}
                        </span>
                      </div>
                      <p className="text-xs text-[#3e2723]/50 mt-0.5 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(req.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      {/* Alasan */}
                      <div className="mt-2 flex items-start gap-1.5 bg-[#faf8f5] rounded-xl p-3 border border-[#e8e0d8]">
                        <ClipboardList size={13} className="text-[#c04838] mt-0.5 shrink-0" />
                        <p className="text-xs text-[#3e2723]/70 leading-relaxed">{req.reason}</p>
                      </div>
                      {/* Info jam kerja jika sudah checkout & approved */}
                      {req.status === "approved" && req.overtime_hours != null && (
                        <p className="mt-2 text-xs font-semibold text-purple-700">
                          Jam lembur tercatat: {req.overtime_hours} jam
                        </p>
                      )}
                      {req.reviewed_at && (
                        <p className="mt-1 text-xs text-[#3e2723]/30">
                          Diproses: {new Date(req.reviewed_at).toLocaleString("id-ID")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {req.status === "pending" && (
                    <div className="flex sm:flex-col gap-2 shrink-0 self-start sm:self-center">
                      <button
                        onClick={() => handleAction(req.id, "approve")}
                        disabled={!!isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                      >
                        <CheckCircle size={15} /> Setujui
                      </button>
                      <button
                        onClick={() => handleAction(req.id, "reject")}
                        disabled={!!isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#faf8f5] hover:bg-red-50 border border-[#e8e0d8] hover:border-red-200 disabled:opacity-50 text-[#c04838] rounded-xl text-sm font-semibold transition-colors"
                      >
                        <XCircle size={15} /> Tolak
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
