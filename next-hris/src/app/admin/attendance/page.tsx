"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ClipboardList, X } from "lucide-react";

type SortKey = "full_name" | "date" | "check_in_time" | "check_out_time" | "status";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} className="opacity-30 ml-1 inline" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="text-[#c04838] ml-1 inline" />
    : <ChevronDown size={12} className="text-[#c04838] ml-1 inline" />;
}

export default function AttendanceReportPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState("Semua");

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Detail modal
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("attendance")
        .select("*, users(full_name, nik, position, division)")
        .order("date", { ascending: false });

      if (data) setRecords(data);
      if (error) console.error(error);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const thCls = (key: SortKey) =>
    `px-4 py-3 cursor-pointer select-none hover:text-[#c04838] transition-colors whitespace-nowrap text-xs font-semibold uppercase tracking-wider ${sortKey === key ? "text-[#c04838]" : "text-[#3e2723]/50"}`;

  const filtered = useMemo(() => {
    let result = records;

    // Filter bulan & tahun
    result = result.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
    });

    // Filter status
    if (filterStatus !== "Semua") result = result.filter(r => r.status === filterStatus);

    // Search nama / NIK
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.users?.full_name?.toLowerCase().includes(q) ||
        r.users?.nik?.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === "full_name") { va = a.users?.full_name?.toLowerCase() ?? ""; vb = b.users?.full_name?.toLowerCase() ?? ""; }
      else { va = a[sortKey] ?? ""; vb = b[sortKey] ?? ""; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [records, filterMonth, filterYear, filterStatus, search, sortKey, sortDir]);

  // Summary stats untuk bulan terpilih
  const summary = useMemo(() => {
    const hadir = filtered.filter(r => r.status === "Hadir").length;
    const terlambat = filtered.filter(r => r.status === "Terlambat").length;
    const withUpdate = filtered.filter(r => r.work_update).length;
    return { total: filtered.length, hadir, terlambat, withUpdate };
  }, [filtered]);

  const fmtTime = (iso: string | null) => {
    if (!iso) return "–";
    return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };
  const fmtDate = (str: string) =>
    new Date(str).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const selectCls = "px-3 py-2 border border-[#e8e0d8] rounded-xl outline-none focus:border-[#c04838] text-[#3e2723] text-sm bg-white transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-1">Rekap</p>
        <h2 className="font-serif text-3xl font-bold text-[#3e2723]">Laporan Absensi</h2>
        <p className="text-[#3e2723]/50 mt-1 text-sm">Rekap kehadiran seluruh karyawan.</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#e8e0d8] p-4 flex flex-wrap gap-3 items-center shadow-[0_2px_12px_rgba(192,72,56,0.04)]">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3e2723]/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama / NIK..."
            className="w-full pl-9 pr-4 py-2 border border-[#e8e0d8] rounded-xl outline-none focus:border-[#c04838] text-[#3e2723] text-sm transition-all"
          />
        </div>

        {/* Bulan */}
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className={selectCls}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>
              {new Date(2000, m - 1).toLocaleString("id-ID", { month: "long" })}
            </option>
          ))}
        </select>

        {/* Tahun */}
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className={selectCls}>
          {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Status */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
          <option value="Semua">Semua Status</option>
          <option value="Hadir">Hadir</option>
          <option value="Terlambat">Terlambat</option>
          <option value="Cuti">Cuti</option>
          <option value="Izin">Izin</option>
          <option value="Sakit">Sakit</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Kehadiran", value: summary.total, color: "text-[#3e2723]" },
          { label: "Hadir Tepat Waktu", value: summary.hadir, color: "text-green-600" },
          { label: "Terlambat", value: summary.terlambat, color: "text-amber-600" },
          { label: "Ada Update Kerja", value: summary.withUpdate, color: "text-[#c04838]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#e8e0d8] px-5 py-4 shadow-[0_2px_8px_rgba(192,72,56,0.04)]">
            <p className="text-xs text-[#3e2723]/50 font-medium">{label}</p>
            <p className={`font-serif text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e8e0d8] shadow-[0_2px_12px_rgba(192,72,56,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf8f5] border-b border-[#e8e0d8]">
                <th className={thCls("full_name")} onClick={() => handleSort("full_name")}>
                  Karyawan <SortIcon col="full_name" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls("date")} onClick={() => handleSort("date")}>
                  Tanggal <SortIcon col="date" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls("check_in_time")} onClick={() => handleSort("check_in_time")}>
                  Masuk <SortIcon col="check_in_time" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls("check_out_time")} onClick={() => handleSort("check_out_time")}>
                  Pulang <SortIcon col="check_out_time" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#3e2723]/50">
                  Jam Kerja
                </th>
                <th className={thCls("status")} onClick={() => handleSort("status")}>
                  Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#3e2723]/50">
                  Update Kerja
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe4]">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#3e2723]/40">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#3e2723]/40">Tidak ada data untuk filter ini.</td></tr>
              ) : (
                filtered.map(r => {
                  // Hitung jam kerja dari notes atau langsung dari waktu
                  let jamKerja = "–";
                  if (r.check_in_time && r.check_out_time) {
                    const ms = new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime();
                    if (ms > 0) {
                      const h = Math.floor(ms / 3600000);
                      const m = Math.floor((ms % 3600000) / 60000);
                      jamKerja = `${h}j ${m}m`;
                    }
                  }

                  return (
                    <tr key={r.id} className="hover:bg-[#faf8f5] transition-colors">
                      {/* Karyawan */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {r.check_in_photo ? (
                            <img src={r.check_in_photo} alt="" className="w-9 h-9 rounded-lg object-cover bg-[#faf8f5] shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-red-50 text-[#c04838] flex items-center justify-center font-bold text-sm shrink-0">
                              {r.users?.full_name?.charAt(0) ?? "?"}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-[#3e2723] text-sm">{r.users?.full_name ?? "–"}</div>
                            <div className="text-xs text-[#3e2723]/40">{r.users?.nik ?? ""}</div>
                          </div>
                        </div>
                      </td>

                      {/* Tanggal */}
                      <td className="px-4 py-3 text-sm text-[#3e2723]/70 whitespace-nowrap">{fmtDate(r.date)}</td>

                      {/* Masuk */}
                      <td className="px-4 py-3 text-sm text-[#3e2723]/70 whitespace-nowrap">{fmtTime(r.check_in_time)}</td>

                      {/* Pulang */}
                      <td className="px-4 py-3 text-sm text-[#3e2723]/70 whitespace-nowrap">{fmtTime(r.check_out_time)}</td>

                      {/* Jam Kerja */}
                      <td className="px-4 py-3 text-sm font-medium text-[#3e2723] whitespace-nowrap">{jamKerja}</td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                          r.status === "Hadir" ? "bg-green-100 text-green-700" :
                          r.status === "Terlambat" ? "bg-amber-100 text-amber-700" :
                          r.status === "Sakit" ? "bg-blue-100 text-blue-700" :
                          r.status === "Cuti" ? "bg-purple-100 text-purple-700" :
                          "bg-[#faf8f5] text-[#3e2723]/60"
                        }`}>
                          {r.status ?? "–"}
                        </span>
                      </td>

                      {/* Update Kerja */}
                      <td className="px-4 py-3 max-w-[220px]">
                        {r.work_update ? (
                          <button
                            onClick={() => setSelected(r)}
                            className="flex items-start gap-1.5 text-left group"
                          >
                            <ClipboardList size={13} className="text-[#c04838] mt-0.5 shrink-0" />
                            <span className="text-xs text-[#3e2723]/70 line-clamp-2 group-hover:text-[#c04838] transition-colors leading-relaxed">
                              {r.work_update}
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs text-[#3e2723]/25">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && (
          <div className="px-6 py-3 border-t border-[#f0ebe4] bg-[#faf8f5] text-xs text-[#3e2723]/40">
            Menampilkan {filtered.length} dari {records.length} total data
          </div>
        )}
      </div>

      {/* Detail Modal — update kerja lengkap */}
      {selected && (
        <div className="fixed inset-0 bg-[#3e2723]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-[#e8e0d8]">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#3e2723]">Update Kerja</h3>
                <p className="text-xs text-[#3e2723]/50 mt-0.5">
                  {selected.users?.full_name} — {fmtDate(selected.date)}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#3e2723]/40 hover:text-[#c04838] transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Info singkat */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Masuk", value: fmtTime(selected.check_in_time) },
                  { label: "Pulang", value: fmtTime(selected.check_out_time) },
                  { label: "Status", value: selected.status },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#faf8f5] rounded-xl py-3 px-2">
                    <p className="text-[10px] text-[#3e2723]/40 uppercase font-semibold tracking-wide">{label}</p>
                    <p className="text-sm font-bold text-[#3e2723] mt-1">{value}</p>
                  </div>
                ))}
              </div>
              {/* Foto selfie checkout */}
              {selected.check_out_photo && (
                <img src={selected.check_out_photo} alt="Selfie check-out" className="w-full rounded-2xl object-cover max-h-48" />
              )}
              {/* Teks update kerja */}
              <div className="bg-[#faf8f5] rounded-2xl p-4 border border-[#e8e0d8]">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList size={14} className="text-[#c04838]" />
                  <span className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Laporan Kerja</span>
                </div>
                <p className="text-sm text-[#3e2723]/80 leading-relaxed">{selected.work_update}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
