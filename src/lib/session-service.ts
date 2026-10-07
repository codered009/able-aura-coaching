import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { assertCan, can, isTrainerRole, participantRoleFor } from "@/lib/permissions";
import type { AuthUser } from "@/lib/types";
import { SESSION_TRANSITIONS, type SessionStatus } from "@/lib/types";
import { randomJoinCode } from "@/lib/utils";

const sessionInclude = {
  course: true,
  mainTrainer: { select: { id: true, name: true, role: true } },
  currentExercise: true,
  enrollment: true,
  participants: {
    include: {
      student: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, role: true } },
    },
    orderBy: { joinedAt: "asc" as const },
  },
};

export class SessionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionServiceError";
  }
}

export async function listSessions(actor: AuthUser) {
  if (actor.role === "parent") {
    const children = await childIdsForParent(actor.id);
    return db.session.findMany({
      where: {
        OR: [
          { course: { enrollments: { some: { studentId: { in: children } } } } },
          { participants: { some: { studentId: { in: children } } } },
        ],
      },
      include: sessionInclude,
      orderBy: { startTime: "desc" },
    });
  }
  if (actor.role === "student" && actor.studentId) {
    return db.session.findMany({
      where: {
        course: { enrollments: { some: { studentId: actor.studentId, status: "active" } } },
      },
      include: sessionInclude,
      orderBy: { startTime: "desc" },
    });
  }
  if (actor.role === "main_trainer") {
    return db.session.findMany({
      where: { mainTrainerId: actor.id },
      include: sessionInclude,
      orderBy: { startTime: "desc" },
    });
  }
  return db.session.findMany({
    include: sessionInclude,
    orderBy: { startTime: "desc" },
  });
}

export async function getSession(id: string) {
  const session = await db.session.findUnique({
    where: { id },
    include: {
      ...sessionInclude,
      aiEvents: {
        include: {
          student: { select: { id: true, name: true } },
          exercise: { select: { id: true, name: true, slug: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
        orderBy: { timestamp: "desc" },
        take: 80,
      },
      privateChannels: {
        where: { closedAt: null },
        include: {
          student: { select: { id: true, name: true } },
          trainer: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!session) throw new SessionServiceError("Session not found.");
  return session;
}

export async function createSession(
  actor: AuthUser,
  input: {
    title: string;
    courseId: string;
    startTime: string;
    mainTrainerId?: string;
    enrollmentId?: string | null;
    currentExerciseId?: string | null;
  },
) {
  assertCan(actor, "sessions.create");
  const course = await db.course.findUnique({ where: { id: input.courseId } });
  if (!course) throw new SessionServiceError("Course not found.");

  const trainerId =
    actor.role === "main_trainer" ? actor.id : (input.mainTrainerId ?? actor.id);
  const trainer = await db.user.findUnique({ where: { id: trainerId } });
  if (!trainer || (trainer.role !== "main_trainer" && trainer.role !== "admin")) {
    throw new SessionServiceError("Main trainer must be an Able Aura trainer.");
  }

  if (input.enrollmentId) {
    const enrollment = await db.enrollment.findUnique({
      where: { id: input.enrollmentId },
    });
    if (!enrollment || enrollment.courseId !== input.courseId) {
      throw new SessionServiceError("Enrollment does not belong to this course.");
    }
  }

  const session = await db.session.create({
    data: {
      title: input.title,
      courseId: input.courseId,
      mainTrainerId: trainerId,
      enrollmentId: input.enrollmentId ?? null,
      startTime: new Date(input.startTime),
      status: "scheduled",
      currentExerciseId: input.currentExerciseId ?? null,
      joinCode: randomJoinCode(),
    },
    include: sessionInclude,
  });

  await writeAudit({
    actorId: actor.id,
    action: "session.create",
    entityType: "session",
    entityId: session.id,
    metadata: { courseId: input.courseId, startTime: input.startTime },
  });
  return session;
}

export async function transitionSession(
  actor: AuthUser,
  sessionId: string,
  next: SessionStatus,
) {
  assertCan(actor, "sessions.lifecycle");
  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new SessionServiceError("Session not found.");
  if (actor.role === "main_trainer" && session.mainTrainerId !== actor.id) {
    throw new SessionServiceError("Only the assigned main trainer can control this session.");
  }
  const allowed = SESSION_TRANSITIONS[session.status as SessionStatus] ?? [];
  if (!allowed.includes(next)) {
    throw new SessionServiceError(
      `Cannot move a ${session.status} session to ${next}.`,
    );
  }

  if (next === "ended") {
    return endSession(actor, sessionId);
  }

  const updated = await db.session.update({
    where: { id: sessionId },
    data: { status: next },
    include: sessionInclude,
  });
  await writeAudit({
    actorId: actor.id,
    action: `session.${next}`,
    entityType: "session",
    entityId: sessionId,
  });
  return updated;
}

export async function setCurrentExercise(
  actor: AuthUser,
  sessionId: string,
  exerciseId: string,
) {
  assertCan(actor, "sessions.exercise");
  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new SessionServiceError("Session not found.");
  if (actor.role === "main_trainer" && session.mainTrainerId !== actor.id) {
    throw new SessionServiceError("Only the assigned main trainer can change the exercise.");
  }
  const exercise = await db.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise || !exercise.isActive) {
    throw new SessionServiceError("Exercise is not available.");
  }
  const updated = await db.session.update({
    where: { id: sessionId },
    data: { currentExerciseId: exerciseId },
    include: sessionInclude,
  });
  await writeAudit({
    actorId: actor.id,
    action: "session.exercise",
    entityType: "session",
    entityId: sessionId,
    metadata: { exerciseId, slug: exercise.slug },
  });
  return updated;
}

export async function joinSession(
  actor: AuthUser,
  sessionId: string,
  options?: { studentId?: string; joinCode?: string },
) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { course: true },
  });
  if (!session) throw new SessionServiceError("Session not found.");
  if (options?.joinCode && options.joinCode !== session.joinCode) {
    throw new SessionServiceError("That join code is not valid for this session.");
  }
  if (session.status === "ended" || session.status === "cancelled") {
    throw new SessionServiceError("This session is closed.");
  }

  let role = participantRoleFor(actor);
  let studentId: string | null = null;

  if (actor.role === "student") {
    studentId = actor.studentId;
    if (!studentId) throw new SessionServiceError("This login is not linked to a student profile.");
    await assertStudentCanJoin(studentId, session.courseId);
    role = "student";
  } else if (actor.role === "parent") {
    const childId = options?.studentId;
    if (childId) {
      const children = await childIdsForParent(actor.id);
      if (!children.includes(childId)) {
        throw new SessionServiceError("You can only observe your own child.");
      }
    }
    role = "observer";
  } else if (actor.role === "admin") {
    role = "main_trainer";
  } else if (actor.role === "main_trainer") {
    role = session.mainTrainerId === actor.id ? "main_trainer" : "secondary_trainer";
  } else if (actor.role === "secondary_trainer") {
    role = "secondary_trainer";
  }

  const existing = await db.sessionParticipant.findFirst({
    where: {
      sessionId,
      userId: actor.id,
      leftAt: null,
    },
  });
  if (existing) return existing;

  const participant = await db.sessionParticipant.create({
    data: {
      sessionId,
      userId: actor.id,
      studentId,
      role,
    },
  });
  await writeAudit({
    actorId: actor.id,
    action: "session.join",
    entityType: "session",
    entityId: sessionId,
    metadata: { role, studentId },
  });
  return participant;
}

export async function leaveSession(actor: AuthUser, sessionId: string) {
  await db.sessionParticipant.updateMany({
    where: { sessionId, userId: actor.id, leftAt: null },
    data: { leftAt: new Date() },
  });
}

export async function assertStudentCanJoin(studentId: string, courseId: string) {
  const enrollment = await db.enrollment.findFirst({
    where: { studentId, courseId, status: "active" },
  });
  if (!enrollment) {
    throw new SessionServiceError(
      "This student is not actively enrolled in the session's course.",
    );
  }
  const now = new Date();
  const subscription = await db.studentSubscription.findFirst({
    where: {
      studentId,
      status: "active",
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });
  if (!subscription) {
    throw new SessionServiceError(
      "This student does not have a valid subscription for live sessions.",
    );
  }
  return { enrollment, subscription };
}

export async function openPrivateAudio(
  actor: AuthUser,
  sessionId: string,
  studentId: string,
) {
  assertCan(actor, "sessions.private_audio");
  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session || (session.status !== "live" && session.status !== "paused")) {
    throw new SessionServiceError("Private audio is only available during a live session.");
  }
  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student) throw new SessionServiceError("Student not found.");

  const existing = await db.privateAudioChannel.findFirst({
    where: { sessionId, trainerId: actor.id, studentId, closedAt: null },
  });
  if (existing) return existing;

  const channel = await db.privateAudioChannel.create({
    data: { sessionId, trainerId: actor.id, studentId },
  });
  await writeAudit({
    actorId: actor.id,
    action: "private_audio.open",
    entityType: "private_audio_channel",
    entityId: channel.id,
    metadata: { sessionId, studentId },
  });
  return channel;
}

export async function closePrivateAudio(actor: AuthUser, channelId: string) {
  const channel = await db.privateAudioChannel.findUnique({ where: { id: channelId } });
  if (!channel) throw new SessionServiceError("Private channel not found.");
  if (channel.trainerId !== actor.id && actor.role !== "admin") {
    throw new SessionServiceError("You can only close your own private channel.");
  }
  const updated = await db.privateAudioChannel.update({
    where: { id: channelId },
    data: { closedAt: new Date() },
  });
  await writeAudit({
    actorId: actor.id,
    action: "private_audio.close",
    entityType: "private_audio_channel",
    entityId: channelId,
  });
  return updated;
}

export async function recordAiEvent(
  actor: AuthUser,
  input: {
    sessionId: string;
    studentId: string;
    exerciseId: string;
    severity: "low" | "moderate" | "high";
    issueType: string;
    suggestedCue: string;
    metricsJson?: Record<string, unknown>;
  },
) {
  const session = await db.session.findUnique({ where: { id: input.sessionId } });
  if (!session || (session.status !== "live" && session.status !== "paused")) {
    throw new SessionServiceError("AI events are only recorded during a live session.");
  }
  if (actor.role === "student" && actor.studentId !== input.studentId) {
    throw new SessionServiceError("A student device may only send its own landmarks.");
  }
  if (actor.role === "parent") {
    throw new SessionServiceError("Observers cannot submit AI events.");
  }

  const consent = await latestConsent(input.studentId);
  if (!consent?.aiProcessing) {
    throw new SessionServiceError("AI processing is not consented for this student.");
  }

  const recent = await db.aiAnalysisEvent.findFirst({
    where: {
      sessionId: input.sessionId,
      studentId: input.studentId,
      issueType: input.issueType,
      timestamp: { gt: new Date(Date.now() - 8000) },
    },
  });
  if (recent) return recent;

  return db.aiAnalysisEvent.create({
    data: {
      sessionId: input.sessionId,
      studentId: input.studentId,
      exerciseId: input.exerciseId,
      severity: input.severity,
      issueType: input.issueType,
      suggestedCue: input.suggestedCue,
      metricsJson: input.metricsJson ? JSON.stringify(input.metricsJson) : null,
    },
  });
}

export async function reviewAiEvent(actor: AuthUser, eventId: string) {
  assertCan(actor, "ai.review");
  const event = await db.aiAnalysisEvent.update({
    where: { id: eventId },
    data: { reviewedById: actor.id, reviewedAt: new Date() },
  });
  await writeAudit({
    actorId: actor.id,
    action: "ai.review",
    entityType: "ai_analysis_event",
    entityId: eventId,
    metadata: { sessionId: event.sessionId, studentId: event.studentId },
  });
  return event;
}

export async function endSession(actor: AuthUser, sessionId: string) {
  assertCan(actor, "sessions.lifecycle");
  const session = await getSession(sessionId);
  if (actor.role === "main_trainer" && session.mainTrainerId !== actor.id) {
    throw new SessionServiceError("Only the assigned main trainer can end this session.");
  }

  const endedAt = new Date();
  await db.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: sessionId },
      data: { status: "ended", endedAt },
    });
    await tx.sessionParticipant.updateMany({
      where: { sessionId, leftAt: null },
      data: { leftAt: endedAt },
    });
    await tx.privateAudioChannel.updateMany({
      where: { sessionId, closedAt: null },
      data: { closedAt: endedAt },
    });
  });

  const students = await db.sessionParticipant.findMany({
    where: { sessionId, role: "student", studentId: { not: null } },
  });
  const uniqueStudentIds = [
    ...new Set(students.map((p) => p.studentId).filter((id): id is string => Boolean(id))),
  ];

  for (const studentId of uniqueStudentIds) {
    const attendance = students.find((p) => p.studentId === studentId);
    const minutes = attendance
      ? Math.max(
          1,
          Math.round(
            ((attendance.leftAt ?? endedAt).getTime() - attendance.joinedAt.getTime()) /
              60000,
          ),
        )
      : 0;
    const events = await db.aiAnalysisEvent.findMany({
      where: { sessionId, studentId },
    });
    const counts = { low: 0, moderate: 0, high: 0 };
    for (const event of events) {
      if (event.severity === "low" || event.severity === "moderate" || event.severity === "high") {
        counts[event.severity] += 1;
      }
    }
    const enrollment = await db.enrollment.findFirst({
      where: { studentId, courseId: session.courseId, status: "active" },
    });
    const existing = await db.progressReport.findFirst({
      where: { sessionId, studentId },
    });
    if (existing) continue;
    await db.progressReport.create({
      data: {
        studentId,
        sessionId,
        enrollmentId: enrollment?.id ?? session.enrollmentId,
        courseId: session.courseId,
        authorId: actor.id,
        trainerNotes: null,
        metricsJson: JSON.stringify({
          attendanceMinutes: minutes,
          exerciseId: session.currentExerciseId,
          aiEventCounts: counts,
          topIssues: events.slice(0, 5).map((e) => e.issueType),
          formConsistency:
            events.length === 0
              ? 1
              : Math.max(0.2, 1 - (counts.high * 0.15 + counts.moderate * 0.08 + counts.low * 0.03)),
        }),
      },
    });
  }

  await writeAudit({
    actorId: actor.id,
    action: "session.ended",
    entityType: "session",
    entityId: sessionId,
    metadata: { reports: uniqueStudentIds.length },
  });
  return getSession(sessionId);
}

export async function childIdsForParent(userId: string) {
  const rows = await db.student.findMany({
    where: { OR: [{ fathersId: userId }, { mothersId: userId }] },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function latestConsent(studentId: string) {
  return db.parentalConsent.findFirst({
    where: { studentId, revokedAt: null },
    orderBy: { grantedAt: "desc" },
  });
}

export async function canViewStudentReport(actor: AuthUser, studentId: string) {
  if (actor.role === "admin") return true;
  if (actor.role === "parent") {
    const children = await childIdsForParent(actor.id);
    return children.includes(studentId);
  }
  if (isTrainerRole(actor.role) && can(actor, "reports.view_assigned")) {
    return true;
  }
  return false;
}

export { sessionInclude };
