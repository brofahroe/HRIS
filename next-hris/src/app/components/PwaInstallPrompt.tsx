"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      return;
    }

    // Check if user dismissed prompt recently (last 7 days)
    const dismissedTime = localStorage.getItem("pwa_install_dismissed");
    if (dismissedTime) {
      const daysPassed =
        (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysPassed < 7) {
        return;
      }
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;

    if (isIOSDevice) {
      setIsIOS(true);
      // Wait 3 seconds before showing subtle iOS install prompt
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Standard Android / Desktop Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );

    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("[PWA] Error launching install prompt:", err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="Install Aplikasi"
      className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-sm z-50 bg-white/95 backdrop-blur-md border border-stone-200 rounded-2xl p-4 shadow-xl text-[#3e2723] animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#faf8f5] border border-stone-200 p-1 flex-shrink-0 flex items-center justify-center">
          <img
            src="/icons/icon-192x192.png"
            alt="Batik Seng HRIS"
            className="w-10 h-10 object-contain rounded-lg"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#c04838]">
              Install Batik Seng HRIS
            </h2>
            <button
              onClick={handleDismiss}
              className="text-stone-400 hover:text-stone-600 p-0.5 rounded-md"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-stone-600 mt-1 leading-snug">
            Pasang aplikasi di layar utama untuk akses cepat presensi selfie & verifikasi GPS.
          </p>

          {showIOSGuide ? (
            <div className="mt-3 p-2.5 bg-[#faf8f5] rounded-lg border border-stone-200 text-xs text-stone-700 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-[#c04838]">
                <Share className="w-3.5 h-3.5" />
                <span>Langkah Pemasangan di Safari iOS:</span>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-stone-600 pt-1">
                <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah browser.</li>
                <li>Pilih <strong>Tambahkan ke Layar Utama</strong> (Add to Home Screen).</li>
              </ol>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#c04838] hover:bg-[#a0382b] text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? "Petunjuk Pasang" : "Install Aplikasi"}</span>
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs text-stone-500 hover:text-stone-700 py-2 px-2.5 font-medium"
              >
                Nanti
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

