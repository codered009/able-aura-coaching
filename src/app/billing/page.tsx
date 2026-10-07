"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClientShell } from "@/components/client-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { rupeesFromPaise } from "@/lib/utils";

type Sub = {
  id: string;
  status: string;
  planOrCourseRef: string;
  student: { name: string };
  pendingPayments: { id: string; amount: number; status: string; dueDate: string }[];
  payments: { id: string; amount: number; status: string; providerRef: string | null }[];
};

export default function BillingPage() {
  const [rows, setRows] = useState<Sub[]>([]);
  async function load() {
    const res = await fetch("/api/billing");
    setRows(await res.json());
  }
  useEffect(() => {
    void load();
  }, []);

  async function pay(pendingPaymentId: string) {
    const res = await fetch("/api/billing", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pendingPaymentId }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success("Payment recorded (Razorpay demo). Subscription is now active.");
    void load();
  }

  return (
    <ClientShell>
      <h1 className="font-serif text-4xl text-teal-950">Subscriptions & payments</h1>
      <p className="mt-2 text-ink/60">
        Uses the existing student_subscriptions, payments, and pending_payments tables. Live join
        requires an active subscription window.
      </p>
      <div className="mt-6 grid gap-4">
        {rows.map((sub) => (
          <Card key={sub.id}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">{sub.student.name}</p>
              <Badge tone={sub.status === "active" ? "green" : "amber"}>{sub.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink/55">Plan / course ref {sub.planOrCourseRef}</p>
            {sub.pendingPayments
              .filter((p) => p.status === "due")
              .map((pending) => (
                <div key={pending.id} className="mt-3 flex items-center justify-between">
                  <span>Due {rupeesFromPaise(pending.amount)}</span>
                  <Button size="sm" onClick={() => pay(pending.id)}>
                    Pay with Razorpay (demo)
                  </Button>
                </div>
              ))}
            {sub.payments.map((payment) => (
              <p key={payment.id} className="mt-2 text-sm text-ink/55">
                Paid {rupeesFromPaise(payment.amount)} · {payment.providerRef}
              </p>
            ))}
          </Card>
        ))}
      </div>
    </ClientShell>
  );
}
