"use client";

import { CameraCard } from "./camera-card";
import { Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Camera } from "@/types";

interface CameraGridProps {
  cameras: Camera[];
}

export function CameraGrid({ cameras }: CameraGridProps) {
  if (cameras.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Video className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center max-w-sm">
            <p className="font-medium text-foreground">Belum ada akses kamera</p>
            <p className="text-sm text-muted-foreground mt-1">
              Anda belum diberi akses ke kamera apapun. Silakan hubungi admin daycare.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cameras.map((camera) => (
        <CameraCard key={camera.id} camera={camera} />
      ))}
    </div>
  );
}