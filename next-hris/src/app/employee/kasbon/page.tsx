"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getWIBDate } from "@/lib/wib";
import { ArrowLeft, Wallet, Clock, ClipboardList, Loader2 } from "lucide-react";

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

export default function EmployeeKasbonPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", session.user.id)
        .single();

      if (userData) {
        setProfile(userData);
        const { data: kasbonData } = await supabase
          .from("cash_advances")
          .select("*")
          .eq("user_id", userData.id)
          .order("created_at", { ascending: false });
        if (kasbonData) setHistory(kasbonData);
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Jumlah kasbon harus lebih dari 0.");
      return;
    }
    if (!reason.trim()) {
      alert("Mohon isi alasan pengajuan kasbon.");
      return;
    }

    setSubmitting(true);
    try {
      // Jika karyawan tidak memiliki supervisor_id, tahap 1 otomatis disetujui agar langsung diproses Admin
      const initialSupervisorStatus = profile.supervisor_id ? "pending" : "approved";

      const { data, error } = await supabase
        .from("cash_advances")
        .insert({
          user_id: profile.id,
          date: getWIBDate(),
          amount: numAmount,
          reason: reason.trim(),
          supervisor_id: profile.supervisor_id || null,
          supervisor_status: initialSupervisorStatus,
          admin_status: "pending",
        })
        .select()
        .single();

      if (error) {
        alert("Gagal mengajukan kasbon: " + error.message);
      } else if (data) {
        alert("Pengajuan kasbon berhasil dikirim!");
        setHistory([data, ...history]);
        setAmount("");
        setReason("");
      }
    } finally {
      setSubmitting(false);
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
      {/* Header */}
      <header className="bg-white border-b border-[#e8e0d8] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 text-[#3e2723]/60 hover:text-[#c04838] hover:bg-red-50 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold text-[#3e2723] leading-tight">Pengajuan Kasbon</h1>
            <p className="text-xs text-[#3e2723]/50">{profile?.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <img src="/Batik Seng-02.png" alt="Batik Seng" className="w-7 h-7 object-contain" />
          <span className="font-bold text-[#c04838] text-sm hidden sm:inline">Batik Seng</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* Form Card */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-[0_4px_20px_rgba(192,72,56,0.06)] border border-[#e8e0d8]">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-xl bg-red-50 text-[#c04838]">
              <Wallet size={22} />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-[#3e2723]">Formulir Kasbon Baru</h2>
              <p className="text-xs text-[#3e2723]/50">
                Kasbon yang disetujui akan dipotong otomatis pada perhitungan gaji bulanan.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Jumlah Kasbon (Rp)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                required
                placeholder="Contoh: 250000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 border border-[#e8e0d8] focus:border-[#c04838] focus:ring-4 focus:ring-[#c04838]/10 rounded-xl outline-none text-[#3e2723] text-sm transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Keperluan / Alasan</label>
              <textarea
                required
                rows={3}
                placeholder="Tuliskan alasan pengajuan kasbon..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border border-[#e8e0d8] focus:border-[#c04838] focus:ring-4 focus:ring-[#c04838]/10 rounded-xl outline-none text-[#3e2723] text-sm resize-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#c04838] hover:bg-[#98382d] disabled:opacity-60 text-white rounded-xl font-bold text-sm shadow-[0_8px_20px_rgba(192,72,56,0.25)] transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 size={18} className="animate-spin" /> Mengirim...</> : "Ajukan Kasbon"}
            </button>
          </form>
        </div>

        {/* History Card */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(192,72,56,0.04)] border border-[#e8e0d8] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e8e0d8]">
            <h3 className="font-bold text-[#3e2723]">Riwayat Pengajuan Kasbon</h3>
          </div>
          <div className="divide-y divide-[#f0ebe4]">
            {history.length === 0 ? (
              <div className="p-8 text-center text-[#3e2723]/40 text-sm">
                Belum ada riwayat pengajuan kasbon.
              </div>
            ) : (
              history.map((h) => {
                const supStatus = (h.supervisor_status || "pending") as KasbonStatus;
                const admStatus = (h.admin_status || "pending") as KasbonStatus;
                return (
                  <div key={h.id} className="p-5 hover:bg-[#faf8f5] transition-colors space-y-2.5">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-serif font-bold text-lg text-[#c04838]">
                          {formatRupiah(h.amount)}
                        </p>
                        <p className="text-xs text-[#3e2723]/50 flex items-center gap-1 mt-0.5">
                          <Clock size={12} />
                          {new Date(h.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge[supStatus]}`}>
                          Supervisor: {statusLabel[supStatus]}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge[admStatus]}`}>
                          Admin: {statusLabel[admStatus]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-[#faf8f5] rounded-xl p-3 border border-[#e8e0d8]">
                      <ClipboardList size={14} className="text-[#c04838] mt-0.5 shrink-0" />
                      <p className="text-xs text-[#3e2723]/70 leading-relaxed">{h.reason}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
