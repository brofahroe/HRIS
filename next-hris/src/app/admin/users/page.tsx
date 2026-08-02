"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { updateUser, deleteUser, createUser, resetPassword } from "./actions";
import { Edit2, Trash2, X, Plus, ChevronUp, ChevronDown, ChevronsUpDown, KeyRound, Loader2 } from "lucide-react";

const inputCls = "w-full px-3 py-2.5 border border-[#e8e0d8] rounded-xl focus:ring-2 focus:ring-[#c04838]/10 focus:border-[#c04838] outline-none text-[#3e2723] text-sm transition-all";

type SortKey = 'full_name' | 'nik' | 'position' | 'role' | 'is_active';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={13} className="opacity-30 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-[#c04838] ml-1 inline" />
    : <ChevronDown size={13} className="text-[#c04838] ml-1 inline" />;
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('nik');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Password update state
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  // Sort logic
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      // Booleans: aktif = true di atas
      if (typeof valA === 'boolean') valA = valA ? 1 : 0;
      if (typeof valB === 'boolean') valB = valB ? 1 : 0;

      // Strings: case-insensitive
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const thCls = (key: SortKey) =>
    `px-6 py-3 cursor-pointer select-none hover:text-[#c04838] transition-colors whitespace-nowrap ${sortKey === key ? 'text-[#c04838]' : ''}`;

  const handleAddClick = () => {
    setEditingUser({ full_name: '', email: '', nik: '', position: '', division: '', role: 'Employee', is_active: true, daily_salary: '', monthly_salary: '' });
    setNewPassword('');
    setCreateMode(true);
    setIsModalOpen(true);
  };

  const handleEditClick = (user: any) => {
    setEditingUser({ ...user });
    setNewPassword('');
    setCreateMode(false);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: string, authId: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data karyawan ${name} secara permanen?`)) {
      const res = await deleteUser(id, authId);
      if (res.success) { alert("Karyawan berhasil dihapus!"); fetchUsers(); }
      else alert("Gagal menghapus: " + res.error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let res: any;

    if (createMode) {
      const fd = new FormData();
      Object.entries(editingUser).forEach(([k, v]) => fd.set(k, String(v)));
      res = await createUser(fd);
      if (res.success) alert(res.message);
    } else {
      res = await updateUser(editingUser.id, editingUser);
    }

    // Update password jika diisi (mode edit saja)
    if (!createMode && newPassword && res.success) {
      setIsResetting(true);
      const pwRes = await resetPassword(editingUser.auth_id, newPassword);
      setIsResetting(false);
      if (!pwRes.success) {
        alert("Data tersimpan, tapi gagal update password: " + pwRes.error);
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    if (res.success) { setIsModalOpen(false); fetchUsers(); }
    else alert("Gagal menyimpan perubahan: " + res.error);
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#c04838] uppercase mb-1">Manajemen</p>
          <h2 className="font-serif text-3xl font-bold text-[#3e2723]">Data Karyawan</h2>
          <p className="text-[#3e2723]/50 mt-1 text-sm">Kelola informasi seluruh karyawan Anda.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="bg-[#c04838] hover:bg-[#98382d] text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_12px_rgba(192,72,56,0.25)] transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Tambah Karyawan
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e8e0d8] shadow-[0_2px_12px_rgba(192,72,56,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf8f5] text-[#3e2723]/50 text-xs font-semibold uppercase tracking-wider border-b border-[#e8e0d8]">
                <th className={thCls('full_name')} onClick={() => handleSort('full_name')}>
                  Nama / Email <SortIcon col="full_name" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls('nik')} onClick={() => handleSort('nik')}>
                  NIK <SortIcon col="nik" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls('position')} onClick={() => handleSort('position')}>
                  Jabatan <SortIcon col="position" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls('role')} onClick={() => handleSort('role')}>
                  Role <SortIcon col="role" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls('is_active')} onClick={() => handleSort('is_active')}>
                  Status <SortIcon col="is_active" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe4]">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[#3e2723]/40">Memuat data...</td></tr>
              ) : sortedUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[#3e2723]/40">Belum ada data karyawan.</td></tr>
              ) : (
                sortedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#faf8f5] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#3e2723] text-sm">{u.full_name}</div>
                      <div className="text-xs text-[#3e2723]/50 mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 text-[#3e2723]/70 text-sm">{u.nik}</td>
                    <td className="px-6 py-4">
                      <div className="text-[#3e2723] text-sm">{u.position}</div>
                      <div className="text-xs text-[#3e2723]/50">{u.division}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${u.role === 'Admin' ? 'bg-red-50 text-[#c04838]' : 'bg-[#faf8f5] text-[#3e2723]/60'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Aktif</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#faf8f5] text-[#3e2723]/50">Nonaktif</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditClick(u)} className="p-2 text-[#c04838] hover:bg-red-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteClick(u.id, u.auth_id, u.full_name)} className="p-2 text-[#3e2723]/40 hover:text-[#c04838] hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-[#3e2723]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-[#e8e0d8]">
              <h3 className="font-serif text-xl font-bold text-[#3e2723]">
                {createMode ? 'Tambah Karyawan' : 'Edit Karyawan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#3e2723]/40 hover:text-[#c04838] transition-colors">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {createMode && (
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Email</label>
                    <input type="email" required value={editingUser.email || ''} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className={inputCls} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Nama Lengkap</label>
                  <input type="text" required value={editingUser.full_name} onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">NIK</label>
                  <input type="text" required value={editingUser.nik} onChange={e => setEditingUser({ ...editingUser, nik: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Jabatan</label>
                  <input type="text" value={editingUser.position || ''} onChange={e => setEditingUser({ ...editingUser, position: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Divisi</label>
                  <input type="text" value={editingUser.division || ''} onChange={e => setEditingUser({ ...editingUser, division: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Hak Akses</label>
                  <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} className={inputCls}>
                    <option value="Employee">Karyawan Biasa</option>
                    <option value="Admin">Admin Pusat</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide">Status</label>
                  <select value={editingUser.is_active ? "true" : "false"} onChange={e => setEditingUser({ ...editingUser, is_active: e.target.value === "true" })} className={inputCls}>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif (Resign)</option>
                  </select>
                </div>
              </div>

              {/* Password Section — hanya saat edit */}
              {!createMode && (
                <div className="pt-4 border-t border-[#f0ebe4] space-y-1.5">
                  <label className="text-xs font-semibold text-[#3e2723] uppercase tracking-wide flex items-center gap-1.5">
                    <KeyRound size={13} className="text-[#c04838]" />
                    Password Baru <span className="font-normal text-[#3e2723]/40 normal-case">(kosongkan jika tidak ingin diubah)</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    minLength={newPassword ? 6 : undefined}
                    className={inputCls}
                  />
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-[#e8e0d8]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[#3e2723]/60 hover:text-[#3e2723] hover:bg-[#faf8f5] font-medium rounded-xl text-sm transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={isSaving || isResetting} className="px-6 py-2.5 bg-[#c04838] hover:bg-[#98382d] disabled:opacity-70 text-white font-semibold rounded-xl text-sm shadow-[0_4px_12px_rgba(192,72,56,0.25)] transition-colors flex items-center gap-2">
                  {(isSaving || isResetting) && <Loader2 size={14} className="animate-spin" />}
                  {isSaving ? "Menyimpan..." : isResetting ? "Update password..." : (createMode ? 'Simpan' : "Simpan Perubahan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
