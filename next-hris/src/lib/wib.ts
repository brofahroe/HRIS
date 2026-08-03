/**
 * Helper konversi waktu ke WIB (UTC+7).
 * Berguna karena server (Vercel) berjalan di UTC, dan toISOString() selalu
 * mengembalikan UTC — sehingga tanggal/waktu perlu di-offset secara eksplisit
 * agar konsisten dengan zona waktu kantor (Batik Seng, Jawa = WIB).
 */

export const WIB_OFFSET_HOURS = 7;

/** Mengembalikan instan yang merepresentasikan jam dinding WIB dari instan saat ini. */
export function getWIBNow(): Date {
  return new Date(Date.now() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
}

/** Tanggal hari ini dalam WIB, format YYYY-MM-DD. */
export function getWIBDate(now: Date = getWIBNow()): string {
  return now.toISOString().slice(0, 10);
}
