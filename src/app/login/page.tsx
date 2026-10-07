"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const DEMOS = [
  { phone: "9800000001", name: "Kavya Rao", role: "Admin" },
  { phone: "9800000002", name: "Arjun Mehta", role: "Main trainer" },
  { phone: "9800000003", name: "Nisha Varghese", role: "Secondary trainer" },
  { phone: "9800000004", name: "Ananya Iyer", role: "Parent" },
  { phone: "9800000006", name: "Aanya Iyer", role: "Student" },
];

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("9800000002");
  const [code, setCode] = useState("123456");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);

  async function sendOtp(nextPhone = phone) {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: nextPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhone(nextPhone);
      setStep("otp");
      if (data.demoCode) setCode(data.demoCode);
      toast.success(`OTP sent to ${data.name}. In this preview the code is ${data.demoCode ?? "on your phone"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Welcome, ${data.name}.`);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify OTP.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <p className="font-serif text-3xl text-teal-900">Sign in with mobile OTP</p>
      <p className="mt-2 text-ink/60">
        Able Aura accounts are phone-first. In this preview every demo number accepts 123456.
      </p>
      <Card className="mt-6 space-y-4">
        <div>
          <Label htmlFor="phone">Mobile number</Label>
          <Input
            id="phone"
            inputMode="numeric"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-1"
          />
        </div>
        {step === "otp" && (
          <div>
            <Label htmlFor="code">OTP</Label>
            <Input
              id="code"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-1"
            />
          </div>
        )}
        {step === "phone" ? (
          <Button className="w-full" size="lg" disabled={busy} onClick={() => sendOtp()}>
            Send OTP
          </Button>
        ) : (
          <Button className="w-full" size="lg" disabled={busy} onClick={verify}>
            Verify & enter
          </Button>
        )}
      </Card>
      <div className="mt-8 space-y-2">
        <p className="text-sm font-semibold text-ink/70">Demo desks</p>
        {DEMOS.map((demo) => (
          <button
            key={demo.phone}
            onClick={() => sendOtp(demo.phone)}
            className="flex w-full items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left hover:bg-cream-2"
          >
            <span>
              <span className="font-semibold">{demo.name}</span>
              <span className="block text-xs text-ink/50">{demo.role}</span>
            </span>
            <span className="text-sm text-teal-800">{demo.phone}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
