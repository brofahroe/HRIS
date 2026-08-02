"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { updateUser, deleteUser, createUser } from "./actions";
import { Edit2, Trash2, X, Plus } from "lucide-react";

const inputCls = "w-full px-3 py-2.5 border border-[#e8e0d8] rounded-xl focus:ring-2 focus:ring-[#c04838]/10 focus:border-[#c04838] outline-none text-[#3e2723] text-sm transition-all";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  const handleAddClick = () => {
    setEditingUser({ full_name: '', email: '', nik: '', position: '', division: '', role: 'Employee', is_active: true, daily_salary: '', monthly_salary: '' });
    setCreateMode(true);
    setIsModalOpen(true);
  };

  const handleEditClick = (user: any) => {
    setEditingUser({ ...user });
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
              <tr className="bg-[#faf8f5] text-[#3e2723]/50 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-3">Nama / Email</th>
                <th className="px-6 py-3">NIK</th>
                <th className="px-6 py-3">Jabatan</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe4]">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[#3e2723]/40">Memuat data...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[#3e2723]/40">Belum ada data karyawan.</td></tr>
              ) : (
                users.map((u) => (
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
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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
              <div className="pt-4 flex justify-end gap-3 border-t border-[#e8e0d8]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[#3e2723]/60 hover:text-[#3e2723] hover:bg-[#faf8f5] font-medium rounded-xl text-sm transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-[#c04838] hover:bg-[#98382d] disabled:opacity-70 text-white font-semibold rounded-xl text-sm shadow-[0_4px_12px_rgba(192,72,56,0.25)] transition-colors">
                  {isSaving ? "Menyimpan..." : (createMode ? 'Simpan' : "Simpan Perubahan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
