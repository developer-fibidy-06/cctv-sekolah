"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  isOperationalHour,
  operationalHoursLabel,
  getJakartaTimeString,
} from "@/lib/time";

export function OutsideHoursNotice() {
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