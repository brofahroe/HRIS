import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthedAdmin, getBearerToken } from "@/lib/apiAuth";

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Konfigurasi server tidak lengkap." }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const admin = await getAuthedAdmin(getBearerToken(request));
    if (!admin) {
      return NextResponse.json({ error: "Akses ditolak. Hanya Admin." }, { status: 403 });
    }

    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.trim() || "";

    let startDate: string | null = null;
    let endDate: string | null = null;
    if (startDateParam || endDateParam) {
      const isValidDate = (value: string | null) => {
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
      };
      if (!isValidDate(startDateParam) || !isValidDate(endDateParam) || startDateParam! > endDateParam!) {
        return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
      }
      startDate = startDateParam;
      endDate = endDateParam;
    } else if (month) {
      const m = Number(month);
      const y = year ? Number(year) : new Date().getFullYear();
      if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 1 || y > 9999) {
        return NextResponse.json({ error: "Bulan atau tahun tidak valid." }, { status: 400 });
      }
      startDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      endDate = end;
    }

    let query = supabaseAdmin
      .from("attendance")
      .select("*, users(full_name, nik, position, division)")
      .order("date", { ascending: false })
      .limit(10000);

    if (startDate && endDate) {
      query = query.gte("date", startDate).lte("date", endDate);
    }

    if (status && status !== "Semua") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    let records = data || [];

    if (search) {
      const q = search.toLowerCase();
      records = records.filter((r: any) =>
        r.users?.full_name?.toLowerCase().includes(q) ||
        r.users?.nik?.toLowerCase().includes(q)
      );
    }

    const fmtTime = (iso: string | null) => {
      if (!iso) return "";
      const d = new Date(iso);
      d.setTime(d.getTime() + 7 * 60 * 60 * 1000);
      const h = String(d.getUTCHours()).padStart(2, "0");
      const m = String(d.getUTCMinutes()).padStart(2, "0");
      return `${h}:${m} WIB`;
    };
    const fmtDate = (str: string) =>
      new Date(str).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return "";
      const s = String(val);
      if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = [
      ["Nama", "NIK", "Jabatan", "Divisi", "Tanggal", "Jam Masuk", "Jam Pulang", "Jam Kerja", "Status", "Update Kerja"],
    ];

    for (const r of records) {
      let jamKerja = "";
      if (r.check_in_time && r.check_out_time) {
        const ms = new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime();
        if (ms > 0) {
          const h = Math.floor(ms / 3600000);
          const m = Math.floor((ms % 3600000) / 60000);
          jamKerja = `${h}j ${m}m`;
        }
      }
      rows.push([
        r.users?.full_name ?? "",
        r.users?.nik ?? "",
        r.users?.position ?? "",
        r.users?.division ?? "",
        fmtDate(r.date),
        fmtTime(r.check_in_time),
        fmtTime(r.check_out_time),
        jamKerja,
        r.status ?? "",
        (r.work_update ?? "").replace(/\r?\n/g, " "),
      ]);
    }

    const csv = "\uFEFF" + rows.map(row => row.map(escapeCsv).join(",")).join("\r\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-absensi${startDate ? `-${startDate}-sampai-${endDate}` : ""}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
