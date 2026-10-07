export const ROLES = [
  "admin",
  "main_trainer",
  "secondary_trainer",
  "parent",
  "student",
] as const;

export type Role = (typeof ROLES)[number];

export const SESSION_STATUSES = [
  "draft",
  "scheduled",
  "live",
  "paused",
  "ended",
  "cancelled",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const PARTICIPANT_ROLES = [
  "main_trainer",
  "secondary_trainer",
  "student",
  "observer",
] as const;

export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

export const SESSION_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["live", "cancelled"],
  live: ["paused", "ended"],
  paused: ["live", "ended"],
  ended: [],
  cancelled: [],
};

export type AuthUser = {
  id: string;
  name: string;
  role: Role;
  phone: string;
  email: string | null;
  studentId: string | null;
};

export type ConsentFlags = {
  camera: boolean;
  recording: boolean;
  aiProcessing: boolean;
};
