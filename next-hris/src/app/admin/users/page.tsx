"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { updateUser, deleteUser, createUser } from "./actions";
import { Edit2, Trash2, X, Plus } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Modal (Edit atau Tambah)
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) setUsers(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddClick = () => {
    setEditingUser({
      full_name: '',
      email: '',
      nik: '',
      position: '',
      division: '',
      role: 'Employee',
      is_active: true,
      daily_salary: '',
      monthly_salary: ''
    });
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
      if (res.success) {
        alert("Karyawan berhasil dihapus!");
        fetchUsers();
      } else {
        alert("Gagal menghapus: " + res.error);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    let res: any;
    if (createMode) {
      const form = e.currentTarget as HTMLFormElement;
      const fd = new FormData(form);
      fd.set('full_name', editingUser.full_name);
      fd.set('email', editingUser.email);
      fd.set('nik', editingUser.nik);
      fd.set('position', editingUser.position);
      fd.set('division', editingUser.division);
      fd.set('role', editingUser.role);
      fd.set('daily_salary', editingUser.daily_salary);
      fd.set('monthly_salary', editingUser.monthly_salary);
      res = await createUser(fd);
      if (res.success) alert(res.message);
    } else {
      res = await updateUser(editingUser.id, editingUser);
    }
    setIsSaving(false);
    
    if (res.success) {
      setIsModalOpen(false);
      fetchUsers();
    } else {
      alert("Gagal menyimpan perubahan: " + res.error);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Data Karyawan</h2>
          <p className="text-slate-500">Kelola informasi seluruh karyawan Anda.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> + Tambah Karyawan
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="px-6 py-3 font-medium">Nama / Email</th>
                <th className="px-6 py-3 font-medium">NIK</th>
                <th className="px-6 py-3 font-medium">Jabatan</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Belum ada data karyawan.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{u.full_name}</div>
                      <div className="text-sm text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{u.nik}</td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800">{u.position}</div>
                      <div className="text-xs text-slate-500">{u.division}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                       <span className={`px-2 py-1 rounded-md text-xs font-semibold ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                         {u.role}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Aktif</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Nonaktif</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditClick(u)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Karyawan"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(u.id, u.auth_id, u.full_name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Karyawan"
                        >
                          <Trash2 size={18} />
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

      {/* MODAL Tambah / Edit */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {createMode ? 'Tambah Karyawan' : 'Edit Karyawan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {createMode && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Email</label>
                    <input
                      type="email"
                      required
                      value={editingUser.email || ''}
                      onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    value={editingUser.full_name} 
                    onChange={e => setEditingUser({...editingUser, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">NIK</label>
                  <input 
                    type="text" 
                    required
                    value={editingUser.nik} 
                    onChange={e => setEditingUser({...editingUser, nik: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Jabatan</label>
                  <input 
                    type="text" 
                    value={editingUser.position || ''} 
                    onChange={e => setEditingUser({...editingUser, position: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Divisi</label>
                  <input 
                    type="text" 
                    value={editingUser.division || ''} 
                    onChange={e => setEditingUser({...editingUser, division: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Hak Akses</label>
                  <select 
                    value={editingUser.role} 
                    onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none" 
                  >
                    <option value="Employee">Karyawan Biasa</option>
                    <option value="Admin">Admin Pusat</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Status Aktif</label>
                  <select 
                    value={editingUser.is_active ? "true" : "false"} 
                    onChange={e => setEditingUser({...editingUser, is_active: e.target.value === "true"})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none" 
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif (Resign)</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-medium rounded-lg"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-medium rounded-lg shadow-sm"
                >
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
