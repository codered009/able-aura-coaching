import type { AuthUser, Role } from "@/lib/types";

export const ACTIONS = [
  "users.manage",
  "children.manage_own",
  "courses.manage",
  "enrollments.admin",
  "enrollments.request",
  "billing.manage",
  "sessions.create",
  "sessions.lifecycle",
  "sessions.join",
  "sessions.observe",
  "sessions.exercise",
  "sessions.private_audio",
  "sessions.multiview",
  "ai.review",
  "uploads.create",
  "reports.view_assigned",
  "reports.view_own_child",
  "recordings.view_assigned",
  "recordings.view_own_child",
  "pose.manage",
  "audit.view",
] as const;

export type Action = (typeof ACTIONS)[number];

const MATRIX: Record<Role, Action[]> = {
  admin: [
    "users.manage",
    "children.manage_own",
    "courses.manage",
    "enrollments.admin",
    "enrollments.request",
    "billing.manage",
    "sessions.create",
    "sessions.lifecycle",
    "sessions.join",
    "sessions.observe",
    "sessions.exercise",
    "sessions.private_audio",
    "sessions.multiview",
    "ai.review",
    "uploads.create",
    "reports.view_assigned",
    "reports.view_own_child",
    "recordings.view_assigned",
    "recordings.view_own_child",
    "pose.manage",
    "audit.view",
  ],
  main_trainer: [
    "sessions.create",
    "sessions.lifecycle",
    "sessions.join",
    "sessions.exercise",
    "sessions.private_audio",
    "sessions.multiview",
    "ai.review",
    "uploads.create",
    "reports.view_assigned",
    "recordings.view_assigned",
  ],
  secondary_trainer: [
    "sessions.join",
    "sessions.private_audio",
    "sessions.multiview",
    "ai.review",
    "reports.view_assigned",
    "recordings.view_assigned",
  ],
  parent: [
    "children.manage_own",
    "enrollments.request",
    "billing.manage",
    "sessions.observe",
    "reports.view_own_child",
    "recordings.view_own_child",
  ],
  student: ["sessions.join"],
};

export function can(user: AuthUser | null | undefined, action: Action) {
  if (!user) return false;
  return MATRIX[user.role].includes(action);
}

export function assertCan(user: AuthUser, action: Action) {
  if (!can(user, action)) {
    const error = new Error("You do not have permission for this action.");
    error.name = "ForbiddenError";
    throw error;
  }
}

export function isTrainerRole(role: Role | string) {
  return role === "admin" || role === "main_trainer" || role === "secondary_trainer";
}

export function participantRoleFor(user: AuthUser): "main_trainer" | "secondary_trainer" | "student" | "observer" {
  if (user.role === "main_trainer" || user.role === "admin") return "main_trainer";
  if (user.role === "secondary_trainer") return "secondary_trainer";
  if (user.role === "student") return "student";
  return "observer";
}
