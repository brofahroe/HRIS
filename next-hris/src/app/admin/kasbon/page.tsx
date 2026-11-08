"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle, XCircle, Clock, ClipboardList, RefreshCw, Wallet } from "lucide-react";

type KasbonStatus = "pending" | "approved" | "rejected";

const statusBadge: Record<KasbonStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

const statusLabel: Record<KasbonStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export default function AdminKasbonPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | KasbonStatus>("pending");

  async function fetchRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cash_advances")
      .select("*, users!cash_advances_user_id_fkey(full_name, nik, position, photo_url)")
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback jika nama constraint berbeda di DB lama
      const { data: raw } = await supabase
        .from("cash_advances")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: allUsers } = await supabase
        .from("users")
        .select("id, full_name, nik, position, photo_url");
      const userMap = new Map((allUsers || []).map(u => [u.id, u]));
      setRequests(
        (raw || []).map(r => ({
          ...r,
          users: userMap.get(r.user_id) || null,
        }))
      );
    } else if (data) {
      setRequests(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setProcessing(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: adminData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", session.user.id)
        .single();

      const { error } = await supabase
        .from("cash_advances")
        .update({ admin_status: status, admin_id: adminData?.id })
        .eq("id", id);

      if (error) {
        alert("Gagal memperbarui status: " + error.message);
      } else {
        setRequests(prev =>
          prev.map(req => (req.id === id ? { ...req, admin_status: status } : req))
        );
      }
    } finally {
      setProcessing(null);
    }
  };

  const formatRupiah = (angka: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(angka) || 0);

  const filtered = filterStatus === "all"
    ? requests
    : requests.filter(r => r.admin_status === filterStatus);

  const pendingCount = requests.filter(r => r.admin_status === "pending").length;
  const selectCls = "px-3 py-2 border border-[#e8e0d8] rounded-xl outline-none focus:border-[#c04838] text-[#3e2723] text-sm bg-white transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-1">Keuangan</p>
          <h2 className="font-serif text-3xl font-bold text-[#3e2723]">Pengajuan Kasbon</h2>
          <p className="text-[#3e2723]/50 mt-1 text-sm">
            Persetujuan akhir (Tahap 2 — Admin) untuk pengajuan kasbon karyawan.
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
          <Wallet size={32} className="text-[#3e2723]/20 mx-auto mb-3" />
          <p className="text-[#3e2723]/40 text-sm">Tidak ada pengajuan kasbon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const isProcessing = processing === req.id;
            const supStatus = (req.supervisor_status || "pending") as KasbonStatus;
            const admStatus = (req.admin_status || "pending") as KasbonStatus;
            const canApprove = admStatus === "pending" && (supStatus === "approved" || !req.supervisor_id);

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border shadow-[0_2px_12px_rgba(192,72,56,0.04)] overflow-hidden transition-all ${
                  admStatus === "pending" ? "border-amber-200" : "border-[#e8e0d8]"
                }`}
              >
                <div className="p-5 flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-red-50 text-[#c04838] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {req.users?.photo_url
                        ? <img src={req.users.photo_url} alt="" className="w-full h-full object-cover" />
                        : req.users?.full_name?.charAt(0) ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#3e2723] text-sm">{req.users?.full_name || "Karyawan"}</span>
                        {req.users?.nik && <span className="text-xs text-[#3e2723]/40">{req.users.nik}</span>}
                        <span className="font-serif font-bold text-[#c04838] text-base ml-1">
                          {formatRupiah(req.amount)}
                        </span>
                      </div>
                      <p className="text-xs text-[#3e2723]/50 mt-0.5 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(req.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold ${statusBadge[supStatus]}`}>
                          Tahap 1 (Supervisor): {statusLabel[supStatus]}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold ${statusBadge[admStatus]}`}>
                          Tahap 2 (Admin): {statusLabel[admStatus]}
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-start gap-1.5 bg-[#faf8f5] rounded-xl p-3 border border-[#e8e0d8]">
                        <ClipboardList size={13} className="text-[#c04838] mt-0.5 shrink-0" />
                        <p className="text-xs text-[#3e2723]/70 leading-relaxed">{req.reason}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex sm:flex-col gap-2 shrink-0 self-start sm:self-center">
                    {canApprove && (
                      <>
                        <button
                          onClick={() => handleAction(req.id, "approved")}
                          disabled={!!isProcessing}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                        >
                          <CheckCircle size={15} /> Setujui Final
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "rejected")}
                          disabled={!!isProcessing}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#faf8f5] hover:bg-red-50 border border-[#e8e0d8] hover:border-red-200 disabled:opacity-50 text-[#c04838] rounded-xl text-sm font-semibold transition-colors"
                        >
                          <XCircle size={15} /> Tolak
                        </button>
                      </>
                    )}
                    {admStatus === "pending" && supStatus === "pending" && req.supervisor_id && (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium">
                        Menunggu Supervisor
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
