"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, CheckCircle, XCircle, Clock, ClipboardList, Wallet, RefreshCw } from "lucide-react";

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

export default function SupervisorKasbonPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", session.user.id)
      .single();

    if (userData && (userData.role === "Supervisor" || userData.role === "Admin")) {
      setProfile(userData);
      const { data: kasbonData, error } = await supabase
        .from("cash_advances")
        .select("*, users!cash_advances_user_id_fkey(full_name, nik, position, photo_url)")
        .eq("supervisor_id", userData.id)
        .order("created_at", { ascending: false });

      if (error) {
        const { data: raw } = await supabase
          .from("cash_advances")
          .select("*")
          .eq("supervisor_id", userData.id)
          .order("created_at", { ascending: false });
        const { data: allUsers } = await supabase
          .from("users")
          .select("id, full_name, nik, position, photo_url");
        const userMap = new Map((allUsers || []).map(u => [u.id, u]));
        setRequests((raw || []).map(r => ({ ...r, users: userMap.get(r.user_id) || null })));
      } else if (kasbonData) {
        setRequests(kasbonData);
      }
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setProcessing(id);
    try {
      const { error } = await supabase
        .from("cash_advances")
        .update({
          supervisor_status: status,
          ...(status === "rejected" ? { admin_status: "rejected" } : {}),
        })
        .eq("id", id);

      if (error) {
        alert("Gagal memperbarui status: " + error.message);
      } else {
        setRequests(prev =>
          prev.map(req =>
            req.id === id
              ? { ...req, supervisor_status: status, ...(status === "rejected" ? { admin_status: "rejected" } : {}) }
              : req
          )
        );
      }
    } finally {
      setProcessing(null);
    }
  };

  const formatRupiah = (angka: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(angka) || 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5] text-[#3e2723]/60">
        Memuat data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <header className="bg-white border-b border-[#e8e0d8] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 text-[#3e2723]/60 hover:text-[#c04838] hover:bg-red-50 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold text-[#3e2723] leading-tight">Approval Kasbon — Tahap 1 (Supervisor)</h1>
            <p className="text-xs text-[#3e2723]/50">{profile?.full_name}</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 text-[#3e2723]/40 hover:text-[#c04838] hover:bg-red-50 rounded-xl transition-colors" title="Refresh">
          <RefreshCw size={18} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e8e0d8] p-16 text-center">
            <Wallet size={32} className="text-[#3e2723]/20 mx-auto mb-3" />
            <p className="text-[#3e2723]/40 text-sm">Belum ada pengajuan kasbon dari anggota tim Anda.</p>
          </div>
        ) : (
          requests.map((req) => {
            const supStatus = (req.supervisor_status || "pending") as KasbonStatus;
            const admStatus = (req.admin_status || "pending") as KasbonStatus;
            const isProcessing = processing === req.id;

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border p-5 shadow-[0_2px_12px_rgba(192,72,56,0.04)] flex flex-col sm:flex-row gap-4 justify-between ${
                  supStatus === "pending" ? "border-amber-200" : "border-[#e8e0d8]"
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#3e2723] text-sm">{req.users?.full_name || "Karyawan"}</span>
                    {req.users?.nik && <span className="text-xs text-[#3e2723]/40">{req.users.nik}</span>}
                    <span className="font-serif font-bold text-[#c04838] text-base">
                      {formatRupiah(req.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-[#3e2723]/50 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(req.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`px-2.5 py-0.5 rounded-full font-semibold ${statusBadge[supStatus]}`}>
                      Status Supervisor: {statusLabel[supStatus]}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-semibold ${statusBadge[admStatus]}`}>
                      Status Admin: {statusLabel[admStatus]}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 bg-[#faf8f5] rounded-xl p-3 border border-[#e8e0d8]">
                    <ClipboardList size={14} className="text-[#c04838] mt-0.5 shrink-0" />
                    <p className="text-xs text-[#3e2723]/70 leading-relaxed">{req.reason}</p>
                  </div>
                </div>

                {supStatus === "pending" && (
                  <div className="flex sm:flex-col gap-2 shrink-0 self-start sm:self-center">
                    <button
                      onClick={() => handleAction(req.id, "approved")}
                      disabled={!!isProcessing}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                      <CheckCircle size={15} /> Setujui
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "rejected")}
                      disabled={!!isProcessing}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#faf8f5] hover:bg-red-50 border border-[#e8e0d8] hover:border-red-200 disabled:opacity-50 text-[#c04838] rounded-xl text-sm font-semibold transition-colors"
                    >
                      <XCircle size={15} /> Tolak
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
