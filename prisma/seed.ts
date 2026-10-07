import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRIORITY_MOVEMENTS = [
  {
    slug: "high-knees",
    name: "High Knees / Marching in place",
    description:
      "March or drive knees up in place. Used for warm-up, rhythm, and hip flexion with an upright trunk.",
    ideal: {
      raisedHipFlexionDeg: 90,
      stanceHipFlexionDeg: 10,
      trunkUprightDeg: 8,
      cadenceSpm: 100,
    },
    tolerance: {
      raisedHipFlexionDeg: 20,
      stanceHipFlexionDeg: 15,
      trunkUprightDeg: 12,
      cadenceSpm: 25,
    },
    cues: [
      "Cue a taller chest before asking for a higher knee.",
      "If one side lags, name the side and tap the rhythm.",
      "Slow the beat if the child is collapsing at the trunk.",
    ],
  },
  {
    slug: "running-form",
    name: "Running form (straight-line / short sprints)",
    description:
      "Short straight-line runs focusing on opposite arm-leg swing, a slight forward lean, and mid-foot contact.",
    ideal: {
      forwardLeanDeg: 10,
      kneeDriveDeg: 80,
      elbowFlexionDeg: 90,
      pelvicRotationDeg: 15,
    },
    tolerance: {
      forwardLeanDeg: 8,
      kneeDriveDeg: 20,
      elbowFlexionDeg: 25,
      pelvicRotationDeg: 12,
    },
    cues: [
      "Ask for quiet feet rather than longer strides.",
      "If arms cross the midline, cue 'pockets to mouth'.",
      "Keep sprints very short for locomotor fatigue.",
    ],
  },
  {
    slug: "jumping",
    name: "Jumping (vertical or broad)",
    description:
      "Prepare, explode, and stick the landing. Tracks knee tracking, hip hinge, and left-right symmetry.",
    ideal: {
      prepKneeFlexionDeg: 90,
      landingKneeFlexionDeg: 70,
      kneeValgusOffset: 0.04,
      hipAnkleAlign: 0.06,
    },
    tolerance: {
      prepKneeFlexionDeg: 25,
      landingKneeFlexionDeg: 25,
      kneeValgusOffset: 0.08,
      hipAnkleAlign: 0.1,
    },
    cues: [
      "Cue 'soft knees' on landing before asking for height.",
      "If knees dive in, ask for 'knees over toes'.",
      "Use a target on the floor for broad jump distance.",
    ],
  },
  {
    slug: "squat-sit-to-stand",
    name: "Squatting / Sit-to-stand",
    description:
      "Chair sit-to-stand or bodyweight squat with hips back, knees tracking, and an upright chest.",
    ideal: {
      kneeFlexionDeg: 100,
      hipFlexionDeg: 95,
      trunkUprightDeg: 20,
      kneeTrackOffset: 0.05,
    },
    tolerance: {
      kneeFlexionDeg: 25,
      hipFlexionDeg: 20,
      trunkUprightDeg: 15,
      kneeTrackOffset: 0.09,
    },
    cues: [
      "Start from a firm chair before free squats.",
      "Cue 'hips back first' if knees shoot forward.",
      "Hold a ball at the chest to keep the trunk tall.",
    ],
  },
  {
    slug: "single-leg-balance",
    name: "Single-leg balance / Static hold",
    description:
      "Quiet single-leg hold. Watches pelvis level, stance knee lock, and trunk sway.",
    ideal: {
      stanceKneeDeg: 175,
      pelvisLevelOffset: 0.03,
      trunkSwayDeg: 6,
      holdSeconds: 8,
    },
    tolerance: {
      stanceKneeDeg: 15,
      pelvisLevelOffset: 0.08,
      trunkSwayDeg: 10,
      holdSeconds: 3,
    },
    cues: [
      "Offer a wall tap before asking for a free hold.",
      "If the pelvis drops, cue 'lift the quiet hip'.",
      "Count out loud; do not correct every wobble.",
    ],
  },
  {
    slug: "catching",
    name: "Catching / Receiving (hands-ready)",
    description:
      "Ready position with hands at chest, elbows soft, and a stable base before the ball arrives.",
    ideal: {
      elbowFlexionDeg: 95,
      handHeightRatio: 0.55,
      stanceWidthRatio: 0.35,
      trunkUprightDeg: 12,
    },
    tolerance: {
      elbowFlexionDeg: 25,
      handHeightRatio: 0.15,
      stanceWidthRatio: 0.12,
      trunkUprightDeg: 15,
    },
    cues: [
      "Show 'alligator hands' at the chest before the toss.",
      "If hands drop, pause the toss and reset the ready shape.",
      "Use a scarf or balloon before a firm ball.",
    ],
  },
  {
    slug: "rolling",
    name: "Rolling (side or forward)",
    description:
      "Segmental roll with chin tuck and a shoulder-then-hip sequence. Avoids throwing the head.",
    ideal: {
      chinTuckDeg: 25,
      shoulderLead: 1,
      hipFollowDelayMs: 180,
      trunkCurlDeg: 30,
    },
    tolerance: {
      chinTuckDeg: 15,
      shoulderLead: 1,
      hipFollowDelayMs: 220,
      trunkCurlDeg: 20,
    },
    cues: [
      "Cue 'look at your belt' before the roll starts.",
      "If they throw the head, slow to a side roll only.",
      "Use a wedge or mat edge to help initiation.",
    ],
  },
  {
    slug: "basic-throwing",
    name: "Basic throwing (overhead or underarm)",
    description:
      "Step with the opposite foot, rotate the trunk, and finish with a long throwing arm.",
    ideal: {
      frontFootPlant: 1,
      elbowExtensionDeg: 160,
      trunkRotationDeg: 35,
      oppositeArmBalance: 0.2,
    },
    tolerance: {
      frontFootPlant: 1,
      elbowExtensionDeg: 25,
      trunkRotationDeg: 20,
      oppositeArmBalance: 0.2,
    },
    cues: [
      "Name the stepping foot before the throw.",
      "If they throw with the same-side foot, freeze and reset.",
      "Start underarm for children who fear overhead reach.",
    ],
  },
] as const;

async function main() {
  await prisma.privateAudioChannel.deleteMany();
  await prisma.aiAnalysisEvent.deleteMany();
  await prisma.progressReport.deleteMany();
  await prisma.sessionRecording.deleteMany();
  await prisma.sessionParticipant.deleteMany();
  await prisma.session.deleteMany();
  await prisma.poseTemplate.deleteMany();
  await prisma.trainingVideoUpload.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.pendingPayment.deleteMany();
  await prisma.studentSubscription.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.parentalConsent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.otpChallenge.deleteMany();
  await prisma.student.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.personEntity.deleteMany();

  const mkUser = async (
    role: string,
    name: string,
    phone: string,
    email: string,
  ) => {
    const person = await prisma.personEntity.create({ data: {} });
    return prisma.user.create({
      data: {
        personEntityId: person.id,
        role,
        name,
        phone,
        email,
      },
    });
  };

  const admin = await mkUser(
    "admin",
    "Kavya Rao",
    "9800000001",
    "kavya.rao@ableaura.in",
  );
  const mainTrainer = await mkUser(
    "main_trainer",
    "Arjun Mehta",
    "9800000002",
    "arjun.mehta@ableaura.in",
  );
  const secondaryTrainer = await mkUser(
    "secondary_trainer",
    "Nisha Varghese",
    "9800000003",
    "nisha.varghese@ableaura.in",
  );
  const mother = await mkUser(
    "parent",
    "Ananya Iyer",
    "9800000004",
    "ananya.iyer@example.com",
  );
  const father = await mkUser(
    "parent",
    "Rohan Iyer",
    "9800000005",
    "rohan.iyer@example.com",
  );
  const studentUser = await mkUser(
    "student",
    "Aanya Iyer",
    "9800000006",
    "aanya.iyer@example.com",
  );
  const mother2 = await mkUser(
    "parent",
    "Meera Shah",
    "9800000007",
    "meera.shah@example.com",
  );
  const mother3 = await mkUser(
    "parent",
    "Lakshmi Menon",
    "9800000008",
    "lakshmi.menon@example.com",
  );

  const aanya = await prisma.student.create({
    data: {
      name: "Aanya Iyer",
      dateOfBirth: new Date("2018-03-14"),
      fathersId: father.id,
      mothersId: mother.id,
      userId: studentUser.id,
      disabilityNotes:
        "Autism. Prefers visual schedules, startles at sudden loud cues. Strong jumping; needs pacing on running.",
      baselinePosture: JSON.stringify({
        trunkLeanDeg: 6,
        preferredStance: "wide",
        notes: "Mild toe-walking when excited.",
      }),
    },
  });

  const vihaan = await prisma.student.create({
    data: {
      name: "Vihaan Shah",
      dateOfBirth: new Date("2016-08-02"),
      mothersId: mother2.id,
      disabilityNotes:
        "Spastic diplegic cerebral palsy. Uses AFOs. Sit-to-stand from a chair; avoid prolonged single-leg without support.",
      baselinePosture: JSON.stringify({
        trunkLeanDeg: 12,
        crouchKneeDeg: 25,
        notes: "Crouch gait; better with verbal count.",
      }),
    },
  });

  const kabir = await prisma.student.create({
    data: {
      name: "Kabir Menon",
      dateOfBirth: new Date("2019-11-21"),
      mothersId: mother3.id,
      disabilityNotes:
        "Locomotor disability, right hemiparesis. Catching and throwing need left-hand ready position first.",
      baselinePosture: JSON.stringify({
        rightShoulderDrop: 0.08,
        notes: "Guards right arm; likes underarm throws.",
      }),
    },
  });

  const foundation = await prisma.course.create({
    data: {
      name: "Foundation Movement Lab",
      description:
        "Twice-weekly live group for children building squat, march, and sit-to-stand with a main trainer and a secondary trainer on private audio.",
    },
  });
  const balance = await prisma.course.create({
    data: {
      name: "Balance & Coordination",
      description:
        "Single-leg holds, catching, and rolling progressions. Secondary trainers watch form badges and step in privately.",
    },
  });
  const athletics = await prisma.course.create({
    data: {
      name: "Playful Athletics",
      description:
        "Short running form, jumping, and basic throwing in a game format. Built for mixed disability groups.",
    },
  });

  const enroll = (studentId: string, courseId: string, status: string) =>
    prisma.enrollment.create({
      data: { studentId, courseId, status },
    });

  const aanyaFoundation = await enroll(aanya.id, foundation.id, "active");
  await enroll(aanya.id, athletics.id, "active");
  await enroll(vihaan.id, foundation.id, "active");
  await enroll(vihaan.id, balance.id, "active");
  await enroll(kabir.id, athletics.id, "active");
  await enroll(kabir.id, foundation.id, "requested");

  const yearFromNow = new Date();
  yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
  const lastYear = new Date();
  lastYear.setFullYear(lastYear.getFullYear() - 1);
  const inTenDays = new Date();
  inTenDays.setDate(inTenDays.getDate() + 10);

  const aanyaSub = await prisma.studentSubscription.create({
    data: {
      studentId: aanya.id,
      planOrCourseRef: foundation.id,
      status: "active",
      startDate: lastYear,
      endDate: yearFromNow,
    },
  });
  const vihaanSub = await prisma.studentSubscription.create({
    data: {
      studentId: vihaan.id,
      planOrCourseRef: foundation.id,
      status: "active",
      startDate: lastYear,
      endDate: yearFromNow,
    },
  });
  const kabirSub = await prisma.studentSubscription.create({
    data: {
      studentId: kabir.id,
      planOrCourseRef: athletics.id,
      status: "pending",
      startDate: new Date(),
      endDate: yearFromNow,
    },
  });

  await prisma.payment.create({
    data: {
      studentSubscriptionId: aanyaSub.id,
      amount: 899900,
      status: "paid",
      paidAt: lastYear,
      providerRef: "pay_demo_aanya",
    },
  });
  await prisma.payment.create({
    data: {
      studentSubscriptionId: vihaanSub.id,
      amount: 899900,
      status: "paid",
      paidAt: lastYear,
      providerRef: "pay_demo_vihaan",
    },
  });
  await prisma.pendingPayment.create({
    data: {
      studentSubscriptionId: kabirSub.id,
      amount: 749900,
      dueDate: inTenDays,
      status: "due",
    },
  });

  const exercises = [];
  for (const movement of PRIORITY_MOVEMENTS) {
    const exercise = await prisma.exercise.create({
      data: {
        name: movement.name,
        slug: movement.slug,
        description: movement.description,
        idealAnglesJson: JSON.stringify(movement.ideal),
        toleranceBands: JSON.stringify(movement.tolerance),
        cueHints: JSON.stringify(movement.cues),
        isActive: true,
      },
    });
    await prisma.poseTemplate.create({
      data: {
        exerciseId: exercise.id,
        version: 1,
        createdFromUpload: false,
        rulesJson: JSON.stringify({
          slug: movement.slug,
          ideal: movement.ideal,
          tolerance: movement.tolerance,
          engine: "on_device_mediapipe_v1",
          cloudFallback: "on_demand_only",
        }),
      },
    });
    exercises.push(exercise);
  }

  const squat = exercises.find((e) => e.slug === "squat-sit-to-stand")!;
  const highKnees = exercises.find((e) => e.slug === "high-knees")!;

  const liveStart = new Date();
  liveStart.setMinutes(liveStart.getMinutes() - 5);

  const liveSession = await prisma.session.create({
    data: {
      mainTrainerId: mainTrainer.id,
      courseId: foundation.id,
      startTime: liveStart,
      status: "scheduled",
      currentExerciseId: squat.id,
      title: "Foundation Lab — Saturday morning",
      joinCode: "482913",
    },
  });

  const pastStart = new Date();
  pastStart.setDate(pastStart.getDate() - 7);
  const pastEnd = new Date(pastStart);
  pastEnd.setMinutes(pastEnd.getMinutes() + 45);

  const pastSession = await prisma.session.create({
    data: {
      mainTrainerId: mainTrainer.id,
      courseId: foundation.id,
      startTime: pastStart,
      status: "ended",
      currentExerciseId: highKnees.id,
      title: "Foundation Lab — last Saturday",
      joinCode: "119204",
      endedAt: pastEnd,
    },
  });

  await prisma.sessionParticipant.createMany({
    data: [
      {
        sessionId: pastSession.id,
        userId: mainTrainer.id,
        role: "main_trainer",
        joinedAt: pastStart,
        leftAt: pastEnd,
      },
      {
        sessionId: pastSession.id,
        userId: secondaryTrainer.id,
        role: "secondary_trainer",
        joinedAt: pastStart,
        leftAt: pastEnd,
      },
      {
        sessionId: pastSession.id,
        studentId: aanya.id,
        userId: studentUser.id,
        role: "student",
        joinedAt: pastStart,
        leftAt: pastEnd,
      },
      {
        sessionId: pastSession.id,
        studentId: vihaan.id,
        role: "student",
        joinedAt: pastStart,
        leftAt: pastEnd,
      },
    ],
  });

  await prisma.aiAnalysisEvent.create({
    data: {
      sessionId: pastSession.id,
      studentId: aanya.id,
      exerciseId: squat.id,
      severity: "moderate",
      issueType: "knee_valgus",
      suggestedCue: "Ask Aanya for 'knees over toes' before the next stand.",
      timestamp: new Date(pastStart.getTime() + 12 * 60 * 1000),
      metricsJson: JSON.stringify({ kneeTrackOffset: 0.14 }),
      reviewedById: secondaryTrainer.id,
      reviewedAt: new Date(pastStart.getTime() + 13 * 60 * 1000),
    },
  });

  await prisma.progressReport.create({
    data: {
      studentId: aanya.id,
      sessionId: pastSession.id,
      enrollmentId: aanyaFoundation.id,
      courseId: foundation.id,
      authorId: mainTrainer.id,
      trainerNotes:
        "Aanya stayed with the visual schedule. Knees collapsed inward on sit-to-stand; Nisha cued privately twice. High knees were rhythmic once the drum slowed.",
      metricsJson: JSON.stringify({
        attendanceMinutes: 44,
        exercises: ["squat-sit-to-stand", "high-knees"],
        aiEventCounts: { low: 1, moderate: 1, high: 0 },
        formConsistency: 0.72,
      }),
    },
  });
  await prisma.progressReport.create({
    data: {
      studentId: vihaan.id,
      sessionId: pastSession.id,
      courseId: foundation.id,
      authorId: mainTrainer.id,
      trainerNotes:
        "Vihaan completed sit-to-stand from the chair with AFOs on. Did not attempt single-leg. Energy good through minute 30.",
      metricsJson: JSON.stringify({
        attendanceMinutes: 41,
        exercises: ["squat-sit-to-stand"],
        aiEventCounts: { low: 2, moderate: 0, high: 0 },
        formConsistency: 0.68,
      }),
    },
  });

  for (const student of [aanya, vihaan]) {
    await prisma.parentalConsent.create({
      data: {
        studentId: student.id,
        grantedById: student.mothersId ?? mother.id,
        camera: true,
        recording: true,
        aiProcessing: true,
      },
    });
  }
  await prisma.parentalConsent.create({
    data: {
      studentId: kabir.id,
      grantedById: mother3.id,
      camera: true,
      recording: false,
      aiProcessing: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "seed_demo_data",
      entityType: "system",
      entityId: "bootstrap",
      metadata: JSON.stringify({
        note: "Local demo seed. Production writes to RDS MySQL.",
      }),
    },
  });

  console.log("Seeded Able Aura demo data.");
  console.log("Demo phones (OTP 123456 in development):");
  console.log("  Admin            9800000001  Kavya Rao");
  console.log("  Main trainer     9800000002  Arjun Mehta");
  console.log("  Secondary        9800000003  Nisha Varghese");
  console.log("  Parent           9800000004  Ananya Iyer");
  console.log("  Student          9800000006  Aanya Iyer");
  console.log(`  Live session code ${liveSession.joinCode}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
