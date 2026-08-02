import { createClient } from "@supabase/supabase-js";

/**
 * Mesin Penggajian (Payroll Engine)
 * Menggabungkan data absen selama 1 bulan dan menghitung gaji karyawan.
 */
export async function generateMonthlyPayroll(month: number, year: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Ambil semua karyawan aktif
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('is_active', true);

    if (usersError) throw usersError;

    // Menentukan rentang tanggal bulan ini
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // 2. Iterasi kalkulasi untuk setiap karyawan
    const payrollResults = [];

    for (const user of users) {
      // Ambil data absensi sebulan
      const { data: attendances, error: attError } = await supabaseAdmin
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (attError) throw attError;

      let presentDays = 0;
      let lateDays = 0;
      
      attendances.forEach(att => {
        if (att.status === 'Hadir') presentDays++;
        if (att.status === 'Terlambat') {
          presentDays++;
          lateDays++;
        }
      });

      // Kalkulasi Dasar
      const baseSalary = Number(user.monthly_salary) || (Number(user.daily_salary) * presentDays);
      const allowance = Number(user.allowance) || 0;
      const childAllowance = Number(user.child_allowance) || 0;
      
      // Potongan Terlambat (Contoh: Potong 50.000 per hari terlambat)
      const latePenalty = lateDays * 50000;
      
      const totalIncome = baseSalary + allowance + childAllowance;
      const totalDeductions = latePenalty; // Bisa ditambah potongan BPJS/Kasbon di sini
      const netSalary = totalIncome - totalDeductions;

      payrollResults.push({
        user_id: user.id,
        employee_name: user.full_name || '-',
        nik: user.nik || '-',
        month: month,
        year: year,
        present_days: presentDays,
        late_days: lateDays,
        base_salary: baseSalary,
        total_allowance: allowance + childAllowance,
        late_deductions: totalDeductions,
        net_salary: netSalary,
        status: 'Pending'
      });
    }

    // 3. Simpan hasil payroll ke database (tabel 'payroll')
    const { error: insertError } = await supabaseAdmin
      .from('payroll')
      .upsert(payrollResults as any[], {
        onConflict: 'user_id,month,year'
      });
    if (insertError) throw insertError;

    return {
      success: true,
      message: `Berhasil kalkulasi & menyimpan gaji untuk ${payrollResults.length} karyawan`,
      data: payrollResults
    };

  } catch (error: any) {
    console.error("Payroll Error:", error);
    return { success: false, error: error.message };
  }
}
