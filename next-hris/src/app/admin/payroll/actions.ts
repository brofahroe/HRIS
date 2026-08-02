"use server";

import { generateMonthlyPayroll } from "@/lib/payrollEngine";
import { revalidatePath } from "next/cache";

export async function processPayrollAction(year: number, month: number) {
  try {
    const results = await generateMonthlyPayroll(year, month);
    revalidatePath('/admin/payroll');
    return { success: true, data: results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
