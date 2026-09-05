import { WIB_OFFSET_HOURS } from "./wib";

/**
 * WIB wall-clock helpers untuk notifikasi absensi.
 * getWIBNow() mengembalikan Date berupa instan UTC yang nilai getUTCHours()-nya
 * sama dengan jam dinding WIB. Jadi pakai getUTCHours()/getUTCMinutes().
 */

export const OFFICE_CHECK_IN_HOUR = 8;   // 08:00 WIB
export const OFFICE_CHECK_OUT_HOUR = 16;  // 16:00 WIB

export const WIB_NOW = (): Date => new Date(Date.now() + WIB_OFFSET_HOURS * 60 * 60 * 1000);

export interface AttendanceNotification {
  type: "checkin" | "checkout";
  title: string;
  message: string;
  urgency: "info" | "warning" | "urgent";
}

/**
 * Menentukan notifikasi absensi yang harus ditampilkan ke pengguna.
 *
 * Logika:
 * - NOTIFIKASI MASUK: tampil 07:30–08:30 WIB di hari kerja biasa,
 *   jika user belum absen masuk hari ini.
 * - NOTIFIKASI PULANG: tampil 15:30–16:30 WIB di hari kerja biasa,
 *   jika user sudah absen masuk tapi belum absen pulang.
 */
export function getAttendanceNotification(
  now: Date,
  isOffDay: boolean,
  todayAttendance: { check_in_time: string | null; check_out_time?: string | null } | null | undefined
): AttendanceNotification | null {
  if (isOffDay) return null;

  const wibHours = now.getUTCHours();
  const wibMinutes = now.getUTCMinutes;
  const currentMinutes = wibHours * 60 + wibMinutes();

  // Window 07:30 – 08:30 WIB  → ingatkan check-in
  const checkInStart = 7 * 60 + 30;
  const checkInEnd = 8 * 60 + 30;

  // Window 15:30 – 16:30 WIB  → ingatkan check-out
  const checkOutStart = 15 * 60 + 30;
  const checkOutEnd = 16 * 60 + 30;

  const hasCheckedIn = todayAttendance?.check_in_time != null;
  const hasCheckedOut = todayAttendance?.check_out_time != null;

  // Check-in reminder
  if (currentMinutes >= checkInStart && currentMinutes < checkInEnd && !hasCheckedIn) {
    const isPastNormal = currentMinutes >= 8 * 60;
    return {
      type: "checkin",
      title: "Absen Masuk",
      message: isPastNormal
        ? "Sudah melewati jam 08:00. Silakan absen masuk sekarang."
        : "Waktunya absen masuk. Jangan lupa melakukan check-in sebelum jam 08:00 WIB.",
      urgency: "warning",
    };
  }

  // Check-out reminder
  if (currentMinutes >= checkOutStart && currentMinutes < checkOutEnd && hasCheckedIn && !hasCheckedOut) {
    const isPastNormal = currentMinutes >= 16 * 60;
    return {
      type: "checkout",
      title: "Absen Pulang",
      message: isPastNormal
        ? "Sudah melewati jam 16:00. Silakan absen pulang sekarang."
        : "Segera lakukan check-out sebelum jam 16:00 WIB.",
      urgency: "warning",
    };
  }

  return null;
}

/** Format menit sekarang ke "HH:MM WIB" untuk display. */
export function formatWIB(now: Date): string {
  const h = String(now.getUTCHours()).padStart(2, "0");
  const m = String(now.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m} WIB`;
}
