"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClientShell } from "@/components/client-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Exercise = { id: string; name: string };
type Upload = {
  id: string;
  status: string;
  videoUrl: string;
  createdAt: string;
  notes: string | null;
  uploader: { name: string };
  exercise: { name: string };
};

export default function UploadsPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [exerciseId, setExerciseId] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    const [e, u] = await Promise.all([
      fetch("/api/exercises").then((r) => r.json()),
      fetch("/api/uploads").then((r) => r.json()),
    ]);
    setExercises(e);
    setUploads(u);
    if (e[0] && !exerciseId) setExerciseId(e[0].id);
  }
  useEffect(() => {
    void load();
  }, []);

  async function submit() {
    if (!file) return toast.error("Choose a video file.");
    const form = new FormData();
    form.set("exerciseId", exerciseId);
    form.set("notes", notes);
    form.set("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success("Upload stored as pending. A later worker will refine the pose template.");
    void load();
  }

  return (
    <ClientShell>
      <h1 className="font-serif text-4xl text-teal-950">Training video uploads</h1>
      <p className="mt-2 text-ink/60">
        Main trainers and admins can upload reference clips. Status stays pending until a model
        worker marks them ready. This is for future pose-template improvement, not child playback.
      </p>
      <Card className="mt-6 space-y-3">
        <select
          className="h-11 w-full rounded-xl border border-ink/15 px-3"
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
        >
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
        <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <input
          className="h-11 w-full rounded-xl border border-ink/15 px-3"
          placeholder="Notes for the model team"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button onClick={submit}>Upload for model training</Button>
      </Card>
      <div className="mt-6 grid gap-3">
        {uploads.map((upload) => (
          <Card key={upload.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{upload.exercise.name}</p>
              <p className="text-sm text-ink/55">
                {upload.uploader.name} · {upload.notes ?? "No notes"}
              </p>
            </div>
            <Badge>{upload.status}</Badge>
          </Card>
        ))}
      </div>
    </ClientShell>
  );
}
