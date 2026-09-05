"use client";

import { X, Clock } from "lucide-react";
import { AttendanceNotification } from "@/lib/attendanceNotifications";

interface NotificationBannerProps {
  notification: AttendanceNotification;
  onDismiss: () => void;
}

export default function NotificationBanner({ notification, onDismiss }: NotificationBannerProps) {
  const borderColor =
    notification.urgency === "urgent"
      ? "border-red-200"
      : notification.urgency === "warning"
      ? "border-amber-200"
      : "border-[#e8e0d8]";

  const bgCls =
    notification.urgency === "urgent"
      ? "bg-red-50"
      : notification.urgency === "warning"
      ? "bg-amber-50"
      : "bg-[#faf8f5]";

  const textCls =
    notification.urgency === "urgent"
      ? "text-red-800"
      : notification.urgency === "warning"
      ? "text-amber-800"
      : "text-[#3e2723]";

  return (
    <div className={`rounded-2xl p-4 border flex items-start gap-3 ${bgCls} ${borderColor} shadow-[0_2px_8px_rgba(192,72,56,0.04)]`}>
      <Clock size={18} className={`shrink-0 mt-0.5 ${notification.urgency === "urgent" ? "text-red-600" : notification.urgency === "warning" ? "text-amber-600" : "text-[#c04838]"}`} />
      <div className="flex-1">
        <p className={`font-semibold text-sm ${textCls}`}>{notification.title}</p>
        <p className={`text-xs mt-0.5 ${textCls} opacity-80`}>{notification.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className={`text-[#3e2723]/30 hover:text-[#c04838] transition-colors p-1 rounded-lg hover:bg-[#e8e0d8]/30`}
        title="Sembunyikan"
      >
        <X size={16} />
      </button>
    </div>
  );
}
