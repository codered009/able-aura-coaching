"use client";

import { useEffect, useRef } from "react";
import type { Landmark } from "@/lib/pose/movements";

export function PoseEngine({
  stream,
  enabled,
  onLandmarks,
}: {
  stream: MediaStream | null;
  enabled: boolean;
  onLandmarks: (landmarks: Landmark[]) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const running = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [stream]);

  useEffect(() => {
    if (!enabled || !stream) return;
    let cancelled = false;
    running.current = true;

    async function loop() {
      const video = videoRef.current;
      if (!video || cancelled) return;
      if (video.readyState >= 2) {
        const landmarks = mockLandmarksFromTime();
        onLandmarks(landmarks);
      }
      window.setTimeout(() => {
        if (!cancelled) void loop();
      }, 1400);
    }
    void loop();
    return () => {
      cancelled = true;
      running.current = false;
    };
  }, [enabled, stream, onLandmarks]);

  return <video ref={videoRef} className="hidden" muted playsInline />;
}

function mockLandmarksFromTime(): Landmark[] {
  const t = Date.now() / 1000;
  const sway = Math.sin(t) * 0.03;
  const kneeIn = 0.08 + Math.abs(Math.sin(t / 2)) * 0.08;
  const points: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.9,
  }));
  const set = (i: number, x: number, y: number) => {
    points[i] = { x, y, visibility: 0.95 };
  };
  set(0, 0.5 + sway, 0.12);
  set(11, 0.38, 0.28);
  set(12, 0.62, 0.28);
  set(13, 0.32, 0.4);
  set(14, 0.68, 0.4);
  set(15, 0.3, 0.5);
  set(16, 0.7, 0.5);
  set(23, 0.42, 0.55);
  set(24, 0.58, 0.55);
  set(25, 0.42 - kneeIn, 0.74);
  set(26, 0.58 + kneeIn * 0.3, 0.74);
  set(27, 0.43, 0.92);
  set(28, 0.57, 0.92);
  return points;
}
