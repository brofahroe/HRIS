"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Users, FileText, Settings, LayoutDashboard, LogOut, CalendarDays, Timer } from "lucide-react";
import ForceChangePassword from "@/app/components/ForceChangePassword";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Data Karyawan", icon: Users },
  { href: "/admin/attendance", label: "Laporan Absensi", icon: CalendarDays },
  { href: "/admin/overtime", label: "Permohonan Lembur", icon: Timer },
  { href: "/admin/payroll", label: "Payroll", icon: FileText },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [pendingOvertime, setPendingOvertime] = useState(0);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const { data: userData } = await supabase
        .from('users').select('role').eq('auth_id', session.user.id).single();
      if (userData?.role === 'Admin') {
        setAuthorized(true);
        setAdminProfile(userData);
        if (userData.must_change_password) setMustChangePassword(true);
        // Ambil jumlah permohonan lembur pending
        const { count } = await supabase
          .from('overtime_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingOvertime(count || 0);
      } else {
        router.push('/dashboard');
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!authorized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#faf8f5] text-[#3e2723]/50">
        Memeriksa otorisasi...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#faf8f5]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#e8e0d8] flex-col hidden md:flex">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#e8e0d8] gap-3">
          <img src="/Batik Seng-02.png" alt="Batik Seng" className="w-9 h-9 object-contain shrink-0" />
          <div>
            <div className="font-bold text-[#c04838] leading-none text-sm">Batik Seng</div>
            <div className="text-[10px] tracking-widest text-[#3e2723]/40 font-bold uppercase mt-0.5">Admin Panel</div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-red-50 text-[#c04838]"
                    : "text-[#3e2723]/60 hover:bg-[#faf8f5] hover:text-[#3e2723]"
                }`}
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {href === "/admin/overtime" && pendingOvertime > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 leading-none">
                    {pendingOvertime}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#e8e0d8]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[#c04838] hover:bg-red-50 font-medium text-sm transition-colors"
          >
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b border-[#e8e0d8] flex items-center justify-between px-6 md:hidden">
          <div className="flex items-center gap-2">
            <img src="/Batik Seng-02.png" alt="Batik Seng" className="w-8 h-8 object-contain" />
            <span className="font-bold text-[#c04838] text-sm">Batik Seng Admin</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-[#c04838] hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={20} />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* Force Change Password Overlay */}
      {mustChangePassword && adminProfile && (
        <ForceChangePassword
          userId={adminProfile.id}
          authId={adminProfile.auth_id}
          userName={adminProfile.full_name}
          onSuccess={() => setMustChangePassword(false)}
        />
      )}
    </div>
  );
}
