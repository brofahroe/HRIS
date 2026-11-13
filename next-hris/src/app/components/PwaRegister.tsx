"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export default function PwaRegister() {
  const [isOffline, setIsOffline] = useState(false);
  const [showStatusToast, setShowStatusToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    // 1. Service Worker registration
    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "test") {
      const handleLoad = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // Check for service worker updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    console.log(
                      "[PWA] Konten baru tersedia, refresh untuk memperbarui."
                    );
                  }
                };
              }
            };
          })
          .catch((error) => {
            console.error("[PWA] Registrasi Service Worker gagal:", error);
          });
      };

      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, []);

  useEffect(() => {
    // 2. Online / Offline network listeners
    const handleOnline = () => {
      setIsOffline(false);
      setToastMessage("Koneksi internet terhubung kembali");
      setShowStatusToast(true);
      const timer = setTimeout(() => setShowStatusToast(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setToastMessage("Koneksi terputus. Mode offline aktif.");
      setShowStatusToast(true);
    };

    // Set initial offline state if already offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showStatusToast && !isOffline) {
    return null;
  }

  return (
    <aside
      aria-label="Status Koneksi"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg text-xs md:text-sm font-medium transition-all duration-300 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"
      style={{
        backgroundColor: isOffline ? "#c04838" : "#2e7d32",
        color: "#ffffff",
      }}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>{toastMessage || "Mode offline aktif"}</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4" />
          <span>{toastMessage}</span>
        </>
      )}
    </aside>
  );
}

