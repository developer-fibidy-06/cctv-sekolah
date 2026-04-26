"use client";

import { Video } from "lucide-react";
import { StreamPlayer } from "./stream-player";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Camera } from "@/types";

interface CameraCardProps {
  camera: Camera;
}

export function CameraCard({ camera }: CameraCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <Video className="h-4 w-4 text-green-700" />
          </div>
          <CardTitle className="text-sm truncate">{camera.label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <StreamPlayer
          deviceId={camera.device_id}
          label={camera.label}
          className="rounded-none border-0 shadow-none"
        />
      </CardContent>
    </Card>
  );
}