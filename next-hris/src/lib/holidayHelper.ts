/**
 * Holiday Helper
 * Cek apakah tanggal tertentu adalah hari Minggu atau hari libur nasional Indonesia.
 * Data libur nasional diambil dari API publik: https://api-harilibur.vercel.app
 */

export interface HolidayInfo {
  isOffDay: boolean;      // true jika Minggu atau libur nasional
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;   // nama libur jika ada
}

// Cache sederhana in-memory agar tidak fetch ulang tiap render
const cache: Record<string, HolidayInfo> = {};

export async function checkOffDay(dateStr: string): Promise<HolidayInfo> {
  if (cache[dateStr]) return cache[dateStr];

  const date = new Date(dateStr);
  const isSunday = date.getDay() === 0; // 0 = Minggu

  let isHoliday = false;
  let holidayName: string | undefined;

  try {
    const year = date.getFullYear();
    const res = await fetch(`https://api-harilibur.vercel.app/api?year=${year}`, {
      next: { revalidate: 86400 } // cache 1 hari
    });
    if (res.ok) {
      const holidays: Array<{ holiday_date: string; holiday_name: string; is_national_holiday: boolean }> = await res.json();
      const match = holidays.find(h => h.holiday_date === dateStr && h.is_national_holiday);
      if (match) {
        isHoliday = true;
        holidayName = match.holiday_name;
      }
    }
  } catch {
    // Jika API gagal, hanya andalkan deteksi Minggu
  }

  const result: HolidayInfo = {
    isOffDay: isSunday || isHoliday,
    isSunday,
    isHoliday,
    holidayName,
  };

  cache[dateStr] = result;
  return result;
}
