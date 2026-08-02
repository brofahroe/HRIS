/**
 * Holiday Helper
 * Cek apakah tanggal tertentu adalah hari Minggu atau hari libur nasional Indonesia.
 *
 * API: https://titimangsa.sangkan.dev  (sangkan-dev/titimangsa)
 * Endpoint: GET /v1/holidays/check?date=YYYY-MM-DD
 *
 * Response shape:
 * { data: { isHoliday: boolean, holidays: [{ localName, isNationalHoliday }] } }
 */

export interface HolidayInfo {
  isOffDay: boolean;     // true jika Minggu ATAU libur nasional
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;  // nama libur jika ada
}

// Cache in-memory sederhana agar tidak fetch ulang tiap render
const cache: Record<string, HolidayInfo> = {};

export async function checkOffDay(dateStr: string): Promise<HolidayInfo> {
  if (cache[dateStr]) return cache[dateStr];

  const date = new Date(dateStr);
  const isSunday = date.getDay() === 0; // 0 = Minggu

  let isHoliday = false;
  let holidayName: string | undefined;

  try {
    const res = await fetch(
      `https://titimangsa.sangkan.dev/v1/holidays/check?date=${dateStr}`,
      { next: { revalidate: 86400 } } // cache 24 jam di Next.js fetch
    );

    if (res.ok) {
      const json = await res.json();
      const data = json?.data;

      if (data?.isHoliday) {
        // Ambil libur nasional saja (bukan cuti bersama)
        const national = (data.holidays ?? []).find((h: any) => h.isNationalHoliday);
        if (national) {
          isHoliday = true;
          holidayName = national.localName ?? national.name;
        }
      }
    }
  } catch {
    // Jika API gagal, andalkan deteksi hari Minggu saja
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
