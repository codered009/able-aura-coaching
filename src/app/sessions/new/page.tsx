"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

type Course = { id: string; name: string };
type Trainer = { id: string; name: string };
type Exercise = { id: string; name: string };

export default function NewSessionPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [title, setTitle] = useState("Foundation Lab");
  const [courseId, setCourseId] = useState("");
  const [mainTrainerId, setMainTrainerId] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch("/api/courses").then((r) => r.json()),
      fetch("/api/trainers").then((r) => r.json()),
      fetch("/api/exercises").then((r) => r.json()),
    ]).then(([c, t, e]) => {
      setCourses(c);
      setTrainers(t);
      setExercises(e);
      if (c[0]) setCourseId(c[0].id);
      if (t[0]) setMainTrainerId(t[0].id);
      if (e[0]) setExerciseId(e[0].id);
    });
    const soon = new Date(Date.now() + 10 * 60 * 1000);
    soon.setSeconds(0, 0);
    setStartTime(soon.toISOString().slice(0, 16));
  }, []);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          courseId,
          mainTrainerId,
          currentExerciseId: exerciseId,
          startTime: new Date(startTime).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Scheduled. Join code ${data.joinCode}`);
      router.push(`/sessions/${data.id}/live`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create session.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <a href="/sessions" className="text-sm font-semibold text-teal-800">
        ← Sessions
      </a>
      <h1 className="mt-3 font-serif text-3xl text-teal-950">Schedule a live session</h1>
      <p className="mt-2 text-ink/60">
        Course is required. Enrolment is optional — group classes usually leave it empty and gate
        each student at join time.
      </p>
      <Card className="mt-6 space-y-4">
        <div>
          <Label>Title</Label>
          <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Course</Label>
          <select
            className="mt-1 h-11 w-full rounded-xl border border-ink/15 px-3"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Main trainer</Label>
          <select
            className="mt-1 h-11 w-full rounded-xl border border-ink/15 px-3"
            value={mainTrainerId}
            onChange={(e) => setMainTrainerId(e.target.value)}
          >
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Opening exercise</Label>
          <select
            className="mt-1 h-11 w-full rounded-xl border border-ink/15 px-3"
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Start</Label>
          <Input
            className="mt-1"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <Button className="w-full" disabled={busy} onClick={submit}>
          Create scheduled session
        </Button>
      </Card>
    </div>
  );
}
