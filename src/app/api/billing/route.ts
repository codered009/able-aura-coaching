import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { assertCan } from "@/lib/permissions";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { childIdsForParent } from "@/lib/session-service";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    const studentFilter =
      actor.role === "parent" ? { studentId: { in: await childIdsForParent(actor.id) } } : {};
    const subscriptions = await db.studentSubscription.findMany({
      where: studentFilter,
      include: {
        student: true,
        payments: { orderBy: { paidAt: "desc" } },
        pendingPayments: true,
      },
      orderBy: { startDate: "desc" },
    });
    return subscriptions;
  });
}

export async function POST(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "billing.manage");
    const body = z
      .object({
        studentId: z.string(),
        planOrCourseRef: z.string(),
        amount: z.number().int().positive(),
        months: z.number().int().min(1).max(24).optional(),
      })
      .parse(await request.json());
    if (actor.role === "parent") {
      const children = await childIdsForParent(actor.id);
      if (!children.includes(body.studentId)) {
        const error = new Error("You can only manage billing for your child.");
        error.name = "ForbiddenError";
        throw error;
      }
    }
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + (body.months ?? 12));
    const subscription = await db.studentSubscription.create({
      data: {
        studentId: body.studentId,
        planOrCourseRef: body.planOrCourseRef,
        status: "pending",
        startDate: start,
        endDate: end,
        pendingPayments: {
          create: { amount: body.amount, dueDate: start, status: "due" },
        },
      },
      include: { pendingPayments: true },
    });
    await writeAudit({
      actorId: actor.id,
      action: "subscription.create",
      entityType: "student_subscription",
      entityId: subscription.id,
    });
    return subscription;
  });
}

export async function PATCH(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "billing.manage");
    const body = z
      .object({ pendingPaymentId: z.string() })
      .parse(await request.json());
    const pending = await db.pendingPayment.findUnique({
      where: { id: body.pendingPaymentId },
    });
    if (!pending) throw new Error("Pending payment not found.");
    const paid = await db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          studentSubscriptionId: pending.studentSubscriptionId,
          amount: pending.amount,
          status: "paid",
          paidAt: new Date(),
          providerRef: `rzp_demo_${Date.now()}`,
        },
      });
      await tx.pendingPayment.update({
        where: { id: pending.id },
        data: { status: "paid" },
      });
      await tx.studentSubscription.update({
        where: { id: pending.studentSubscriptionId },
        data: { status: "active" },
      });
      return payment;
    });
    await writeAudit({
      actorId: actor.id,
      action: "payment.paid",
      entityType: "payment",
      entityId: paid.id,
      metadata: { provider: "razorpay_demo", amount: paid.amount },
    });
    return paid;
  });
}
