"use client";

import { useEffect, useState } from "react";
import { Clock, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  isOperationalHour,
  operationalHoursLabel,
  getJakartaTimeString,
} from "@/lib/time";

interface OutsideHoursNoticeProps {
  /** Kalau true (super admin), notice tetap muncul tapi dengan info "tetap bisa stream" */
  isAdmin?: boolean;
}

export function OutsideHoursNotice({ isAdmin = false }: OutsideHoursNoticeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [now, setNow] = useState("");

  useEffect(() => {
    const check = () => {
      setIsOpen(isOperationalHour());
      setNow(getJakartaTimeString());
    };
    check();
    const id = setInterval(check, 60_000); // re-check tiap menit
    return () => clearInterval(id);
  }, []);

  if (isOpen) return null;

  // Admin variant: info-only, tone biru (bukan amber)
  if (isAdmin) {
    return (
      <Card className="border-blue-200 bg-blue-50/60">
        <CardContent className="flex items-start gap-4 py-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-blue-900">
              Di luar jam operasional (mode admin bypass)
            </p>
            <p className="text-sm text-blue-800 mt-0.5">
              Jam operasional reguler {operationalHoursLabel()} WIB. Sebagai admin,
              kamu tetap bisa mengakses stream untuk testing & monitoring.
            </p>
            {now && (
              <p className="text-xs text-blue-700 mt-2">Sekarang: {now} WIB</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Parent variant: warning, tone amber
  return (
    <Card className="border-amber-200 bg-amber-50/60">
      <CardContent className="flex items-start gap-4 py-5">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Clock className="h-5 w-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900">Daycare sedang tutup</p>
          <p className="text-sm text-amber-800 mt-0.5">
            Streaming hanya tersedia setiap hari pukul {operationalHoursLabel()} WIB.
          </p>
          {now && (
            <p className="text-xs text-amber-700 mt-2">Sekarang: {now} WIB</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}