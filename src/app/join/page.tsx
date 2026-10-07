"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("482913");
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/sessions/${data.id}/live`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="font-serif text-4xl text-teal-950">Join class</h1>
      <p className="mt-2 text-lg text-ink/65">
        Type the 6-digit code your trainer said out loud. Large buttons. No extra menus.
      </p>
      <Card className="mt-6 space-y-4">
        <div>
          <Label htmlFor="code">Class code</Label>
          <Input
            id="code"
            className="mt-2 h-16 text-center text-3xl tracking-[0.4em]"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <Button size="xl" className="w-full" disabled={busy} onClick={join}>
          Enter the room
        </Button>
      </Card>
    </div>
  );
}
