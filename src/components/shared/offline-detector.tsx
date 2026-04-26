"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfflineDetector() {
  const [isOnline, setIsOnline] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowAlert(true);
        setTimeout(() => {
          setShowAlert(false);
          setWasOffline(false);
        }, 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowAlert(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  if (isOnline && !showAlert) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] animate-in slide-in-from-top-5 duration-300">
      <div
        className="flex items-center justify-between px-4 py-3 rounded-lg shadow-2xl border-2"
        style={{
          backgroundColor: isOnline ? "#dcfce7" : "#fee2e2",
          borderColor: isOnline ? "#86efac" : "#fca5a5",
        }}
      >
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-700 flex-shrink-0" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-700 flex-shrink-0" />
          )}
          <p
            className={`text-sm font-semibold ${isOnline ? "text-green-900" : "text-red-900"
              }`}
          >
            {isOnline
              ? "Koneksi internet tersambung kembali"
              : "Tidak ada koneksi internet"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowAlert(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}