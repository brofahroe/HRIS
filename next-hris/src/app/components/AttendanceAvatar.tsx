"use client";

import { useState } from "react";

interface AttendanceAvatarProps {
  photoUrl?: string | null;
  name?: string | null;
  size?: string;
  className?: string;
}

export default function AttendanceAvatar({
  photoUrl,
  name,
  size = "w-9 h-9",
  className = "",
}: AttendanceAvatarProps) {
  const [hasError, setHasError] = useState(false);

  if (photoUrl && !hasError) {
    return (
      <img
        src={photoUrl}
        alt={name || "Karyawan"}
        onError={() => setHasError(true)}
        className={`${size} rounded-lg object-cover bg-[#faf8f5] shrink-0 border border-stone-200/60 ${className}`}
      />
    );
  }

  const initial = (name?.trim()?.charAt(0) || "?").toUpperCase();

  return (
    <div
      className={`${size} rounded-lg bg-red-50 text-[#c04838] border border-red-100 flex items-center justify-center font-bold text-sm shrink-0 select-none ${className}`}
      title={name || "Karyawan"}
    >
      {initial}
    </div>
  );
}

