"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { useSessionRoom } from "@/components/live/use-session-room";
import { PoseEngine } from "@/components/live/pose-engine";
import { can, isTrainerRole } from "@/lib/permissions";
import type { AuthUser } from "@/lib/types";
import { cn } from "@/lib/utils";

type Exercise = { id: string; name: string; slug: string };
type SessionPayload = {
  id: string;
  title: string;
  status: string;
  joinCode: string;
  course: { name: string };
  currentExercise: Exercise | null;
  mainTrainer: { name: string };
};

export function SessionRoom({
  user,
  session,
  exercises,
}: {
  user: AuthUser;
  session: SessionPayload;
  exercises: Exercise[];
}) {
  const router = useRouter();
  const room = useSessionRoom(session.id, session.currentExercise?.slug ?? null);
  const [exerciseId, setExerciseId] = useState(session.currentExercise?.id ?? "");
  const [busy, setBusy] = useState(false);
  const lastPose = useRef(0);
  const trainer = isTrainerRole(user.role);
  const studentMode = user.role === "student";
  const exercise = exercises.find((item) => item.id === exerciseId) ?? session.currentExercise;

  const onLandmarks = useCallback(
    (landmarks: Parameters<typeof room.publishPose>[0]) => {
      if (!user.studentId || !exercise) return;
      const now = Date.now();
      if (now - lastPose.current < 2500) return;
      lastPose.current = now;
      void room.publishPose(landmarks, user.studentId, exercise.id, exercise.slug);
    },
    [exercise, room, user.studentId],
  );

  useEffect(() => {
    if (session.currentExercise?.id) setExerciseId(session.currentExercise.id);
  }, [session.currentExercise?.id]);

  async function lifecycle(next: "live" | "paused" | "ended") {
    setBusy(true);
    try {
      await fetch(`/api/sessions/${session.id}/lifecycle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      room.signalStatus(next);
      if (next === "ended") router.push("/sessions");
    } finally {
      setBusy(false);
    }
  }

  async function changeExercise(id: string) {
    setExerciseId(id);
    await fetch(`/api/sessions/${session.id}/exercise`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ exerciseId: id }),
    });
    room.signalExercise(id);
  }

  const trainerRemote = room.remotes.find((item) => item.peer.role === "main_trainer");
  const studentRemotes = room.remotes.filter((item) => item.peer.role === "student");
  const status = room.status === "connecting" ? session.status : room.status;

  if (studentMode) {
    return (
      <div className="mx-auto min-h-[80vh] max-w-3xl space-y-4">
        <div className="rounded-3xl bg-ink p-4 text-cream">
          <p className="text-sm text-cream/70">{session.course.name}</p>
          <h1 className="font-serif text-3xl">{exercise?.name ?? "Wait for your trainer"}</h1>
          <p className="mt-1 text-sm text-cream/70">
            {session.mainTrainer.name} is leading. The helper never talks to you — only your trainers do.
          </p>
        </div>
        <div className="overflow-hidden rounded-3xl bg-black">
          <VideoTile stream={trainerRemote?.stream ?? room.localStream} label="Trainer" large />
        </div>
        {room.privateStudentId === user.studentId && (
          <div className="rounded-2xl bg-teal-800 px-4 py-3 text-lg font-semibold text-white">
            Your trainer is helping you privately. Keep going.
          </div>
        )}
        <div className="flex justify-between gap-3">
          <div className="overflow-hidden rounded-2xl bg-black">
            <VideoTile stream={room.localStream} label="You" />
          </div>
          <Button variant="danger" size="xl" onClick={() => router.push("/dashboard")}>
            Leave class
          </Button>
        </div>
        <PoseEngine
          stream={room.localStream}
          enabled={Boolean(user.studentId && exercise)}
          onLandmarks={onLandmarks}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink/50">{session.course.name}</p>
          <h1 className="font-serif text-3xl text-teal-950">{session.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={status === "live" ? "green" : "amber"}>{status}</Badge>
            <Badge>Code {session.joinCode}</Badge>
            <Badge tone={room.signalState === "on" ? "green" : "rose"}>
              Signal {room.signalState}
            </Badge>
          </div>
        </div>
        {can(user, "sessions.lifecycle") && (
          <div className="flex flex-wrap gap-2">
            {status !== "live" && (
              <Button disabled={busy} onClick={() => lifecycle("live")}>
                Start live
              </Button>
            )}
            {status === "live" && (
              <Button variant="outline" disabled={busy} onClick={() => lifecycle("paused")}>
                Pause
              </Button>
            )}
            {status === "paused" && (
              <Button disabled={busy} onClick={() => lifecycle("live")}>
                Resume
              </Button>
            )}
            <Button variant="danger" disabled={busy} onClick={() => lifecycle("ended")}>
              End & write reports
            </Button>
          </div>
        )}
      </div>

      {room.error && (
        <Card className="border-rose-200 bg-rose-50 text-rose-900">{room.error}</Card>
      )}

      <div className={cn("grid gap-4", trainer ? "xl:grid-cols-[1fr_320px]" : "grid-cols-1")}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl bg-black">
              <VideoTile stream={room.localStream} label={`${user.name} (you)`} />
            </div>
            {trainerRemote && (
              <div className="overflow-hidden rounded-2xl bg-black">
                <VideoTile stream={trainerRemote.stream} label={trainerRemote.peer.name} />
              </div>
            )}
          </div>

          {trainer && can(user, "sessions.multiview") && (
            <div>
              <h2 className="mb-2 font-serif text-xl">Student cameras</h2>
              {studentRemotes.length === 0 ? (
                <Card className="text-sm text-ink/60">
                  Waiting for students. They join with code {session.joinCode} on web, Android, or TV.
                  AI badges appear only here — never on the child&apos;s screen.
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {studentRemotes.map((remote) => {
                    const latest = room.aiEvents.find(
                      (event) =>
                        (event as { studentId?: string }).studentId === remote.peer.studentId,
                    ) as
                      | { severity?: string; suggestedCue?: string; issueType?: string }
                      | undefined;
                    return (
                      <div key={remote.peerId} className="overflow-hidden rounded-2xl bg-black">
                        <VideoTile
                          stream={remote.stream}
                          label={remote.peer.studentName ?? remote.peer.name}
                          badge={latest}
                        />
                        {remote.peer.studentId && (
                          <div className="flex justify-end bg-ink p-2">
                            <Button
                              size="sm"
                              variant={
                                room.privateStudentId === remote.peer.studentId ? "accent" : "outline"
                              }
                              onClick={() => room.openPrivate(remote.peer.studentId!)}
                            >
                              {room.privateStudentId === remote.peer.studentId ? (
                                <PhoneOff className="h-4 w-4" />
                              ) : (
                                <Phone className="h-4 w-4" />
                              )}
                              Private audio
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {user.role === "parent" && (
            <Card>
              You are observing as a parent. You can see the main trainer. Student cameras and AI
              badges stay with the coaching team.
            </Card>
          )}
        </div>

        {trainer && (
          <aside className="space-y-4">
            {can(user, "sessions.exercise") && (
              <Card>
                <p className="mb-2 text-sm font-semibold">Current exercise</p>
                <select
                  className="h-11 w-full rounded-xl border border-ink/15 px-3"
                  value={exerciseId}
                  onChange={(event) => changeExercise(event.target.value)}
                >
                  {exercises.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Card>
            )}
            <Card className="max-h-[28rem] overflow-auto">
              <p className="mb-2 text-sm font-semibold">AI flags for trainers</p>
              <p className="mb-3 text-xs text-ink/50">
                Suggested cues only. Never spoken to the child.
              </p>
              {room.aiEvents.length === 0 ? (
                <p className="text-sm text-ink/50">No flags yet this session.</p>
              ) : (
                <ul className="space-y-2">
                  {room.aiEvents.map((event, index) => {
                    const row = event as {
                      id?: string;
                      severity?: string;
                      suggestedCue?: string;
                      student?: { name?: string };
                      issueType?: string;
                    };
                    return (
                      <li key={row.id ?? index} className="rounded-xl bg-cream-2 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            tone={
                              row.severity === "high"
                                ? "rose"
                                : row.severity === "moderate"
                                  ? "amber"
                                  : "teal"
                            }
                          >
                            {row.severity}
                          </Badge>
                          <span className="text-xs text-ink/50">{row.issueType}</span>
                        </div>
                        <p className="mt-1 text-sm font-medium">{row.suggestedCue}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </aside>
        )}
      </div>

      {user.role === "student" || user.studentId ? (
        <PoseEngine
          stream={room.localStream}
          enabled={Boolean(user.studentId && exercise)}
          onLandmarks={onLandmarks}
        />
      ) : null}
    </div>
  );
}

function VideoTile({
  stream,
  label,
  large,
  badge,
}: {
  stream: MediaStream | null | undefined;
  label: string;
  large?: boolean;
  badge?: { severity?: string; suggestedCue?: string } | undefined;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      void ref.current.play().catch(() => undefined);
    }
  }, [stream]);
  return (
    <div className={cn("relative bg-zinc-900", large ? "aspect-video" : "aspect-video")}>
      <video ref={ref} className="h-full w-full object-cover" playsInline muted={label.includes("you") || label === "You"} />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 p-2 text-sm text-white">
        <span>{label}</span>
        {badge?.severity && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              badge.severity === "high" ? "bg-rose-600" : "bg-amber-500 text-ink",
            )}
          >
            {badge.severity}
          </span>
        )}
      </div>
    </div>
  );
}
