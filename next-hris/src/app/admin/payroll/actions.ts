"use server";

import { generateMonthlyPayroll } from "@/lib/payrollEngine";
import { revalidatePath } from "next/cache";

export async function processPayrollAction(year: number, month: number): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    const results = await generateMonthlyPayroll(year, month);
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
