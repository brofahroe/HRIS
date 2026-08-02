export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-1">Konfigurasi</p>
        <h2 className="font-serif text-3xl font-bold text-[#3e2723]">Pengaturan Sistem</h2>
        <p className="text-[#3e2723]/50 mt-1 text-sm">Konfigurasi variabel dan pengaturan HRIS.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8e0d8] shadow-[0_2px_12px_rgba(192,72,56,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e8e0d8] bg-[#faf8f5]">
          <h3 className="font-semibold text-[#3e2723]">Pengaturan Absensi</h3>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Jam Masuk Standar</label>
              <input
                type="time"
                defaultValue="08:00"
                className="w-full px-4 py-3 border border-[#e8e0d8] rounded-xl focus:ring-2 focus:ring-[#c04838]/10 focus:border-[#c04838] outline-none transition-all text-[#3e2723]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Toleransi Keterlambatan (Menit)</label>
              <input
                type="number"
                defaultValue="15"
                className="w-full px-4 py-3 border border-[#e8e0d8] rounded-xl focus:ring-2 focus:ring-[#c04838]/10 focus:border-[#c04838] outline-none transition-all text-[#3e2723]"
              />
            </div>
          </div>
          <div className="pt-2">
            <button className="bg-[#c04838] hover:bg-[#98382d] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_12px_rgba(192,72,56,0.25)] transition-colors">
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
