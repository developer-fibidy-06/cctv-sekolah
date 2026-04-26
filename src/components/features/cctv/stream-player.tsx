"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2, AlertCircle, RefreshCw, VideoOff, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StreamPlayerProps {
  deviceId: string;
  label: string;
  className?: string;
}

type StreamState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "playing" }
  | { kind: "needs-tap" }
  | { kind: "error"; message: string; code?: string };

export function StreamPlayer({ deviceId, label, className }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [state, setState] = useState<StreamState>({ kind: "idle" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function initStream() {
      setState({ kind: "loading" });

      try {
        const res = await fetch(
          `/api/stream?deviceId=${encodeURIComponent(deviceId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setState({
            kind: "error",
            message: data.error ?? "Gagal memuat stream",
            code: data.code,
          });
          return;
        }

        const video = videoRef.current;
        if (!video) return;

        const tryPlay = () => {
          video.play().catch(() => {
            // autoplay diblok browser → tampilkan tap overlay
            if (!cancelled) setState({ kind: "needs-tap" });
          });
        };

        if (Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: 10,
            maxMaxBufferLength: 30,
            liveSyncDuration: 3,
          });
          hlsRef.current = hls;

          hls.loadSource(data.url);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (cancelled) return;
            setState({ kind: "playing" });
            tryPlay();
          });

          hls.on(Hls.Events.ERROR, (_event, errData) => {
            if (cancelled) return;
            if (errData.fatal) {
              setState({
                kind: "error",
                message: "Koneksi stream terputus",
              });
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari iOS — native HLS support
          video.src = data.url;
          video.addEventListener("loadedmetadata", () => {
            if (cancelled) return;
            setState({ kind: "playing" });
            tryPlay();
          });
        } else {
          setState({
            kind: "error",
            message: "Browser tidak mendukung HLS streaming",
          });
        }
      } catch {
        if (cancelled) return;
        setState({ kind: "error", message: "Gagal terhubung ke server" });
      }
    }

    initStream();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [deviceId, retryKey]);

  const handleRetry = () => setRetryKey((k) => k + 1);

  const handleTapPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video
      .play()
      .then(() => setState({ kind: "playing" }))
      .catch(() =>
        setState({ kind: "error", message: "Gagal memutar video" })
      );
  };

  return (
    <div
      className={cn(
        "relative aspect-video bg-slate-900 rounded-xl overflow-hidden border shadow-sm",
        className
      )}
    >
      {/* Label overlay dengan live indicator */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md">
        {state.kind === "playing" && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
        <span className="text-white text-xs font-medium">{label}</span>
      </div>

      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        controls={state.kind === "playing"}
      />

      {/* Loading overlay */}
      {state.kind === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-slate-900/80">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Menghubungkan...</p>
        </div>
      )}

      {/* Tap-to-play overlay (autoplay blocked) */}
      {state.kind === "needs-tap" && (
        <button
          type="button"
          onClick={handleTapPlay}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-slate-900/70 hover:bg-slate-900/80 transition-colors cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-7 w-7 fill-white ml-0.5" />
          </div>
          <p className="text-sm">Tap untuk memutar</p>
        </button>
      )}

      {/* Error overlay */}
      {state.kind === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-slate-900/90 px-6 text-center">
          {state.code === "OUTSIDE_HOURS" ? (
            <VideoOff className="h-10 w-10 text-amber-400" />
          ) : (
            <AlertCircle className="h-10 w-10 text-red-400" />
          )}
          <p className="text-sm max-w-xs">{state.message}</p>
          {state.code !== "OUTSIDE_HOURS" && (
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Coba Lagi
            </Button>
          )}
        </div>
      )}
    </div>
  );
}