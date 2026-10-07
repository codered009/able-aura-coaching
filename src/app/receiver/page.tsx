"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ReceiverPage() {
  const [code, setCode] = useState("482913");
  const [title, setTitle] = useState("Casting to the TV");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.body.classList.add("bg-black");
    return () => document.body.classList.remove("bg-black");
  }, []);

  async function cast() {
    const res = await fetch(`/api/sessions/lookup?code=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (res.ok) {
      setTitle(data.title);
      setReady(true);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-8 text-cream">
      <p className="text-sm uppercase tracking-[0.3em] text-cream/50">Able Aura TV</p>
      <h1 className="mt-4 font-serif text-5xl">{title}</h1>
      {!ready ? (
        <div className="mt-8 flex w-full max-w-md flex-col gap-3">
          <Input
            className="h-16 text-center text-3xl tracking-[0.4em] text-ink"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button size="xl" onClick={cast}>
            Show this class on the TV
          </Button>
          <p className="text-center text-sm text-cream/60">
            Chromecast / Google TV receiver. Sign in on the phone first, then cast this page.
          </p>
        </div>
      ) : (
        <p className="mt-6 max-w-xl text-center text-xl text-cream/70">
          Waiting for the main trainer broadcast. Student cameras stay off the television.
        </p>
      )}
    </div>
  );
}
