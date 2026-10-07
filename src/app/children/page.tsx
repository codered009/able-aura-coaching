"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ageFromDob } from "@/lib/utils";
import { ClientShell } from "@/components/client-shell";

type Student = {
  id: string;
  name: string;
  dateOfBirth: string;
  disabilityNotes: string | null;
  enrollments: { id: string; status: string; course: { name: string } }[];
  consents: { camera: boolean; recording: boolean; aiProcessing: boolean }[];
};

export default function ChildrenPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const res = await fetch("/api/students");
    setStudents(await res.json());
  }
  useEffect(() => {
    void load();
  }, []);

  async function create() {
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, dateOfBirth: dob, disabilityNotes: notes }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success("Child profile saved.");
    setName("");
    setNotes("");
    void load();
  }

  async function consent(studentId: string, flags: { camera: boolean; recording: boolean; aiProcessing: boolean }) {
    const res = await fetch("/api/consents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, ...flags }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success("Consent updated.");
    void load();
  }

  return (
    <ClientShell>
      <h1 className="font-serif text-4xl text-teal-950">Your children</h1>
      <p className="mt-2 text-ink/60">
        Camera, recording, and AI processing each need an explicit yes. AI never speaks to the child.
      </p>
      <div className="mt-6 grid gap-4">
        {students.map((student) => {
          const current = student.consents[0];
          return (
            <Card key={student.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-sm text-ink/55">
                    Age {ageFromDob(student.dateOfBirth)}
                    {student.disabilityNotes ? ` · ${student.disabilityNotes}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Badge tone={current?.camera ? "green" : "rose"}>Camera</Badge>
                  <Badge tone={current?.recording ? "green" : "rose"}>Recording</Badge>
                  <Badge tone={current?.aiProcessing ? "green" : "rose"}>AI</Badge>
                </div>
              </div>
              <div className="mt-3 text-sm text-ink/60">
                {student.enrollments.map((e) => (
                  <span key={e.id} className="mr-2">
                    {e.course.name} ({e.status})
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    consent(student.id, {
                      camera: true,
                      recording: true,
                      aiProcessing: true,
                    })
                  }
                >
                  Allow camera, recording & AI
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    consent(student.id, {
                      camera: true,
                      recording: false,
                      aiProcessing: true,
                    })
                  }
                >
                  Camera + AI, no recording
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="mt-8 space-y-3">
        <p className="font-semibold">Add a child</p>
        <div>
          <Label>Name</Label>
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Date of birth</Label>
          <Input className="mt-1" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div>
          <Label>Disability notes for trainers</Label>
          <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button onClick={create}>Save child</Button>
      </Card>
    </ClientShell>
  );
}
