export type Landmark = { x: number; y: number; z?: number; visibility?: number };

export const MP = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
};

export type PoseFlag = {
  severity: "low" | "moderate" | "high";
  issueType: string;
  suggestedCue: string;
  metrics: Record<string, number>;
};

export type MovementDef = {
  slug: string;
  analyze: (landmarks: Landmark[]) => PoseFlag[];
};

function visible(lm: Landmark | undefined, min = 0.45) {
  return Boolean(lm && (lm.visibility ?? 1) >= min);
}

function angle(a?: Landmark, b?: Landmark, c?: Landmark) {
  if (!a || !b || !c) return null;
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag = Math.sqrt(abx * abx + aby * aby) * Math.sqrt(cbx * cbx + cby * cby);
  if (mag === 0) return null;
  const clamped = Math.min(1, Math.max(-1, dot / mag));
  return (Math.acos(clamped) * 180) / Math.PI;
}

function mid(a?: Landmark, b?: Landmark) {
  if (!a || !b) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function trunkLean(landmarks: Landmark[]) {
  const shoulder = mid(landmarks[MP.leftShoulder], landmarks[MP.rightShoulder]);
  const hip = mid(landmarks[MP.leftHip], landmarks[MP.rightHip]);
  if (!shoulder || !hip) return null;
  const dx = shoulder.x - hip.x;
  const dy = hip.y - shoulder.y;
  return (Math.abs(Math.atan2(dx, dy)) * 180) / Math.PI;
}

function kneeTrackOffset(side: "left" | "right", landmarks: Landmark[]) {
  const knee = landmarks[side === "left" ? MP.leftKnee : MP.rightKnee];
  const ankle = landmarks[side === "left" ? MP.leftAnkle : MP.rightAnkle];
  if (!visible(knee) || !visible(ankle)) return null;
  return Math.abs(knee.x - ankle.x);
}

export const MOVEMENTS: MovementDef[] = [
  {
    slug: "high-knees",
    analyze(landmarks) {
      const flags: PoseFlag[] = [];
      const left = angle(landmarks[MP.leftHip], landmarks[MP.leftKnee], landmarks[MP.leftAnkle]);
      const right = angle(landmarks[MP.rightHip], landmarks[MP.rightKnee], landmarks[MP.rightAnkle]);
      const lean = trunkLean(landmarks);
      const hipL = landmarks[MP.leftHip];
      const kneeL = landmarks[MP.leftKnee];
      const hipR = landmarks[MP.rightHip];
      const kneeR = landmarks[MP.rightKnee];
      const leftLift = hipL && kneeL ? hipL.y - kneeL.y : 0;
      const rightLift = hipR && kneeR ? hipR.y - kneeR.y : 0;
      const lift = Math.max(leftLift, rightLift);
      if (lean != null && lean > 20) {
        flags.push({
          severity: lean > 30 ? "high" : "moderate",
          issueType: "trunk_collapse",
          suggestedCue: "Cue a taller chest before asking for a higher knee.",
          metrics: { trunkLeanDeg: lean },
        });
      }
      if (lift < 0.04) {
        flags.push({
          severity: "low",
          issueType: "low_knee_drive",
          suggestedCue: "Slow the beat and ask for 'knee to belt'.",
          metrics: { lift, leftKnee: left ?? 0, rightKnee: right ?? 0 },
        });
      }
      return flags;
    },
  },
  {
    slug: "running-form",
    analyze(landmarks) {
      const flags: PoseFlag[] = [];
      const lean = trunkLean(landmarks);
      const leftElbow = angle(
        landmarks[MP.leftShoulder],
        landmarks[MP.leftElbow],
        landmarks[MP.leftWrist],
      );
      if (lean != null && lean > 22) {
        flags.push({
          severity: "moderate",
          issueType: "overstride_lean",
          suggestedCue: "Ask for quiet feet rather than a bigger lean.",
          metrics: { trunkLeanDeg: lean },
        });
      }
      if (leftElbow != null && (leftElbow < 60 || leftElbow > 130)) {
        flags.push({
          severity: "low",
          issueType: "arm_carry",
          suggestedCue: "Cue 'pockets to mouth' so the arms stay compact.",
          metrics: { leftElbowDeg: leftElbow },
        });
      }
      return flags;
    },
  },
  {
    slug: "jumping",
    analyze(landmarks) {
      const flags: PoseFlag[] = [];
      const leftValgus = kneeTrackOffset("left", landmarks);
      const rightValgus = kneeTrackOffset("right", landmarks);
      const leftKnee = angle(landmarks[MP.leftHip], landmarks[MP.leftKnee], landmarks[MP.leftAnkle]);
      if (leftValgus != null && leftValgus > 0.12) {
        flags.push({
          severity: "high",
          issueType: "knee_valgus",
          suggestedCue: "Ask for 'knees over toes' before the next jump.",
          metrics: { leftValgus, rightValgus: rightValgus ?? 0 },
        });
      }
      if (leftKnee != null && leftKnee > 165) {
        flags.push({
          severity: "moderate",
          issueType: "stiff_landing",
          suggestedCue: "Cue 'soft knees' on the landing.",
          metrics: { leftKneeDeg: leftKnee },
        });
      }
      return flags;
    },
  },
  {
    slug: "squat-sit-to-stand",
    analyze(landmarks) {
      const flags: PoseFlag[] = [];
      const knee = angle(landmarks[MP.leftHip], landmarks[MP.leftKnee], landmarks[MP.leftAnkle]);
      const hip = angle(landmarks[MP.leftShoulder], landmarks[MP.leftHip], landmarks[MP.leftKnee]);
      const track = kneeTrackOffset("left", landmarks);
      const lean = trunkLean(landmarks);
      if (track != null && track > 0.11) {
        flags.push({
          severity: "moderate",
          issueType: "knee_valgus",
          suggestedCue: "Ask for 'knees over toes' before the next stand.",
          metrics: { kneeTrackOffset: track, kneeDeg: knee ?? 0 },
        });
      }
      if (lean != null && lean > 35) {
        flags.push({
          severity: "moderate",
          issueType: "trunk_fold",
          suggestedCue: "Hold a ball at the chest to keep the trunk tall.",
          metrics: { trunkLeanDeg: lean, hipDeg: hip ?? 0 },
        });
      }
      return flags;
    },
  },
  {
    slug: "single-leg-balance",
    analyze(landmarks) {
      const flags: PoseFlag[] = [];
      const leftHip = landmarks[MP.leftHip];
      const rightHip = landmarks[MP.rightHip];
      const pelvis = leftHip && rightHip ? Math.abs(leftHip.y - rightHip.y) : null;
      const stance = angle(landmarks[MP.leftHip], landmarks[MP.leftKnee], landmarks[MP.leftAnkle]);
      const lean = trunkLean(landmarks);
      if (pelvis != null && pelvis > 0.08) {
        flags.push({
          severity: "moderate",
          issueType: "pelvic_drop",
          suggestedCue: "Cue 'lift the quiet hip' or offer a wall tap.",
          metrics: { pelvisOffset: pelvis },
        });
      }
      if (lean != null && lean > 18) {
        flags.push({
          severity: "low",
          issueType: "trunk_sway",
          suggestedCue: "Count the hold out loud; do not correct every wobble.",
          metrics: { trunkLeanDeg: lean, stanceKneeDeg: stance ?? 0 },
        });
      }
      return flags;
    },
  },
  {
    slug: "catching",
    analyze(landmarks) {
      const flags: PoseFlag[] = [];
      const leftElbow = angle(
        landmarks[MP.leftShoulder],
        landmarks[MP.leftElbow],
        landmarks[MP.leftWrist],
      );
      const wrist = landmarks[MP.leftWrist];
      const shoulder = landmarks[MP.leftShoulder];
      const hip = landmarks[MP.leftHip];
      if (wrist && shoulder && hip) {
        const range = hip.y - shoulder.y;
        const handHeight = range === 0 ? 0 : (hip.y - wrist.y) / range;
        if (handHeight < 0.35) {
          flags.push({
            severity: "moderate",
            issueType: "hands_low",
            suggestedCue: "Show 'alligator hands' at the chest before the toss.",
            metrics: { handHeightRatio: handHeight },
          });
        }
      }
      if (leftElbow != null && leftElbow > 150) {
        flags.push({
          severity: "low",
          issueType: "elbows_locked",
          suggestedCue: "Cue soft elbows so the catch can give.",
          metrics: { leftElbowDeg: leftElbow },
        });
      }
      return flags;
    },
  },
  {
    slug: "rolling",
    analyze(landmarks) {
      const flags: PoseFlag[] = [];
      const nose = landmarks[MP.nose];
      const shoulder = mid(landmarks[MP.leftShoulder], landmarks[MP.rightShoulder]);
      if (nose && shoulder && nose.y + 0.02 < shoulder.y) {
        flags.push({
          severity: "high",
          issueType: "head_throw",
          suggestedCue: "Cue 'look at your belt' and switch to a side roll.",
          metrics: { headLead: shoulder.y - nose.y },
        });
      }
      return flags;
    },
  },
  {
    slug: "basic-throwing",
    analyze(landmarks) {
      const flags: PoseFlag[] = [];
      const leftAnkle = landmarks[MP.leftAnkle];
      const rightAnkle = landmarks[MP.rightAnkle];
      const rightElbow = angle(
        landmarks[MP.rightShoulder],
        landmarks[MP.rightElbow],
        landmarks[MP.rightWrist],
      );
      if (leftAnkle && rightAnkle && Math.abs(leftAnkle.x - rightAnkle.x) < 0.06) {
        flags.push({
          severity: "moderate",
          issueType: "no_step",
          suggestedCue: "Name the stepping foot before the throw.",
          metrics: { stanceWidth: Math.abs(leftAnkle.x - rightAnkle.x) },
        });
      }
      if (rightElbow != null && rightElbow < 70) {
        flags.push({
          severity: "low",
          issueType: "short_arm",
          suggestedCue: "Ask for a longer finish after the ball leaves the hand.",
          metrics: { rightElbowDeg: rightElbow },
        });
      }
      return flags;
    },
  },
];

export function analyzeMovement(slug: string, landmarks: Landmark[]) {
  const movement = MOVEMENTS.find((item) => item.slug === slug);
  if (!movement || landmarks.length < 29) return [];
  return movement.analyze(landmarks);
}
