"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SignalOutbound, SignalPeer } from "@/lib/signalling-protocol";
import { canReceiveMedia } from "@/lib/signalling-protocol";
import { analyzeMovement, type Landmark } from "@/lib/pose/movements";

const ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

type RemoteStream = {
  peerId: string;
  stream: MediaStream;
  peer: SignalPeer;
};

export function useSessionRoom(sessionId: string, exerciseSlug: string | null) {
  const [peers, setPeers] = useState<SignalPeer[]>([]);
  const [you, setYou] = useState<SignalPeer | null>(null);
  const [status, setStatus] = useState<string>("connecting");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotes, setRemotes] = useState<RemoteStream[]>([]);
  const [aiEvents, setAiEvents] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [signalState, setSignalState] = useState<"off" | "on" | "error">("off");
  const [privateStudentId, setPrivateStudentId] = useState<string | null>(null);

  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const socket = useRef<WebSocket | null>(null);
  const youRef = useRef<SignalPeer | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<SignalPeer[]>([]);

  const addRemote = useCallback((peer: SignalPeer, stream: MediaStream) => {
    setRemotes((current) => {
      const rest = current.filter((item) => item.peerId !== peer.peerId);
      return [...rest, { peerId: peer.peerId, stream, peer }];
    });
  }, []);

  const ensurePc = useCallback(
    (peer: SignalPeer, kind: "media" | "private-audio") => {
      const key = `${peer.peerId}:${kind}`;
      const existing = pcs.current.get(key);
      if (existing) return existing;
      const pc = new RTCPeerConnection(ICE);
      localRef.current?.getTracks().forEach((track) => {
        if (kind === "private-audio" && track.kind !== "audio") return;
        pc.addTrack(track, localRef.current!);
      });
      pc.onicecandidate = (event) => {
        if (event.candidate && socket.current?.readyState === WebSocket.OPEN) {
          socket.current.send(
            JSON.stringify({
              type: "ice",
              to: peer.peerId,
              candidate: JSON.stringify(event.candidate),
              kind,
            }),
          );
        }
      };
      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        addRemote(peer, stream);
      };
      pcs.current.set(key, pc);
      return pc;
    },
    [addRemote],
  );

  const callPeer = useCallback(
    async (peer: SignalPeer) => {
      const self = youRef.current;
      if (!self) return;
      if (!canReceiveMedia(peer.role, self.role) && !canReceiveMedia(self.role, peer.role)) {
        return;
      }
      const pc = ensurePc(peer, "media");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.current?.send(
        JSON.stringify({ type: "offer", to: peer.peerId, sdp: offer.sdp, kind: "media" }),
      );
    },
    [ensurePc],
  );

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: true,
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        localRef.current = media;
        setLocalStream(media);

        const tokenRes = await fetch("/api/auth/token");
        const tokenJson = await tokenRes.json();
        if (!tokenJson.token) throw new Error("Sign in again to join the room.");
        await fetch(`/api/sessions/${sessionId}/join`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });

        const url = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "ws://127.0.0.1:43124";
        const ws = new WebSocket(`${url.replace(/\/$/, "")}/signal`);
        socket.current = ws;
        ws.onopen = () => {
          setSignalState("on");
          ws.send(JSON.stringify({ type: "join", sessionId, token: tokenJson.token }));
        };
        ws.onerror = () => setSignalState("error");
        ws.onclose = () => setSignalState("off");
        ws.onmessage = async (event) => {
          const message = JSON.parse(String(event.data)) as SignalOutbound;
          if (message.type === "error") {
            setError(message.message);
            return;
          }
          if (message.type === "joined") {
            youRef.current = message.you;
            setYou(message.you);
            peersRef.current = message.peers;
            setPeers(message.peers);
            setStatus(message.status);
            for (const peer of message.peers) await callPeer(peer);
            return;
          }
          if (message.type === "peer-joined") {
            setPeers((current) => {
              const next = [...current.filter((p) => p.peerId !== message.peer.peerId), message.peer];
              peersRef.current = next;
              return next;
            });
            await callPeer(message.peer);
            return;
          }
          if (message.type === "peer-left") {
            setPeers((current) => current.filter((p) => p.peerId !== message.peerId));
            setRemotes((current) => current.filter((p) => p.peerId !== message.peerId));
            return;
          }
          if (message.type === "offer") {
            const peer =
              peersRef.current.find((p) => p.peerId === message.from) ??
              ({
                peerId: message.from,
                userId: message.from,
                name: "Peer",
                role: "student",
              } as SignalPeer);
            if (!peer) return;
            const pc = ensurePc(peer, message.kind);
            await pc.setRemoteDescription({ type: "offer", sdp: message.sdp });
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(
              JSON.stringify({
                type: "answer",
                to: message.from,
                sdp: answer.sdp,
                kind: message.kind,
              }),
            );
            return;
          }
          if (message.type === "answer") {
            const pc = pcs.current.get(`${message.from}:${message.kind}`);
            if (pc) await pc.setRemoteDescription({ type: "answer", sdp: message.sdp });
            return;
          }
          if (message.type === "ice") {
            const pc = pcs.current.get(`${message.from}:${message.kind}`);
            if (pc) await pc.addIceCandidate(JSON.parse(message.candidate));
            return;
          }
          if (message.type === "session-state") setStatus(message.status);
          if (message.type === "ai-flag") {
            setAiEvents((current) => [message.event, ...current].slice(0, 40));
          }
          if (message.type === "private-audio-open") {
            setPrivateStudentId(message.studentId);
          }
          if (message.type === "private-audio-close") {
            setPrivateStudentId((current) =>
              current === message.studentId ? null : current,
            );
          }
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open camera.");
      }
    }
    start();
    return () => {
      cancelled = true;
      socket.current?.close();
      localRef.current?.getTracks().forEach((t) => t.stop());
      pcs.current.forEach((pc) => pc.close());
    };
  }, [sessionId, callPeer, ensurePc]);

  const publishPose = useCallback(
    async (landmarks: Landmark[], studentId: string, exerciseId: string, slug: string) => {
      const flags = analyzeMovement(slug, landmarks);
      if (!flags.length) return;
      for (const flag of flags) {
        const res = await fetch(`/api/sessions/${sessionId}/ai-events`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            studentId,
            exerciseId,
            severity: flag.severity,
            issueType: flag.issueType,
            suggestedCue: flag.suggestedCue,
            metricsJson: flag.metrics,
          }),
        });
        if (!res.ok) continue;
        const event = await res.json();
        socket.current?.send(JSON.stringify({ type: "ai-flag", event }));
        setAiEvents((current) => [event, ...current].slice(0, 40));
      }
    },
    [sessionId],
  );

  const openPrivate = useCallback(
    async (studentId: string) => {
      await fetch(`/api/sessions/${sessionId}/private-audio`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      socket.current?.send(JSON.stringify({ type: "private-audio-open", studentId }));
      setPrivateStudentId(studentId);
    },
    [sessionId],
  );

  const signalExercise = useCallback((exerciseId: string) => {
    socket.current?.send(JSON.stringify({ type: "exercise", exerciseId }));
  }, []);

  const signalStatus = useCallback((next: string) => {
    socket.current?.send(JSON.stringify({ type: "session-state", status: next }));
    setStatus(next);
  }, []);

  return {
    you,
    peers,
    status,
    localStream,
    remotes,
    aiEvents,
    error,
    signalState,
    privateStudentId,
    publishPose,
    openPrivate,
    signalExercise,
    signalStatus,
    exerciseSlug,
  };
}
