"use server";

import { generateMonthlyPayroll } from "@/lib/payrollEngine";
import { revalidatePath } from "next/cache";
import { getAuthedAdmin } from "@/lib/apiAuth";

export async function processPayrollAction(
  token: string,
  year: number,
  month: number
): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    const admin = await getAuthedAdmin(token);
    if (!admin) return { success: false, error: "Akses ditolak. Hanya Admin yang dapat memproses payroll." };

    // PENTING: generateMonthlyPayroll(month, year) — urutan parameternya
    // KEBALIK dari fungsi ini (year, month). Sebelumnya di sini dipanggil
    // generateMonthlyPayroll(year, month) yang membuat bulan & tahun
    // tertukar saat menghitung rentang tanggal absensi. Diperbaiki di bawah.
    const results = await generateMonthlyPayroll(month, year);
    revalidatePath('/admin/payroll');
    
    if (results.success) {
      return { success: true, data: results.data as any[] };
    } else {
      return { success: false, error: results.error as string };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
