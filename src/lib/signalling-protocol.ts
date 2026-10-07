export type SignalRole =
  | "main_trainer"
  | "secondary_trainer"
  | "student"
  | "observer";

export type SignalPeer = {
  peerId: string;
  userId: string;
  name: string;
  role: SignalRole;
  studentId?: string | null;
  studentName?: string | null;
};

export type SignalInbound =
  | { type: "join"; sessionId: string; token: string }
  | { type: "leave" }
  | { type: "offer"; to: string; sdp: string; kind: "media" | "private-audio" }
  | { type: "answer"; to: string; sdp: string; kind: "media" | "private-audio" }
  | { type: "ice"; to: string; candidate: string; kind: "media" | "private-audio" }
  | { type: "exercise"; exerciseId: string }
  | { type: "session-state"; status: string }
  | { type: "ai-flag"; event: Record<string, unknown> }
  | { type: "private-audio-open"; studentId: string }
  | { type: "private-audio-close"; studentId: string }
  | { type: "clip-request"; studentId: string };

export type SignalOutbound =
  | { type: "joined"; you: SignalPeer; peers: SignalPeer[]; status: string; exerciseId: string | null }
  | { type: "peer-joined"; peer: SignalPeer }
  | { type: "peer-left"; peerId: string }
  | { type: "offer"; from: string; sdp: string; kind: "media" | "private-audio" }
  | { type: "answer"; from: string; sdp: string; kind: "media" | "private-audio" }
  | { type: "ice"; from: string; candidate: string; kind: "media" | "private-audio" }
  | { type: "exercise"; exerciseId: string }
  | { type: "session-state"; status: string }
  | { type: "ai-flag"; event: Record<string, unknown> }
  | { type: "private-audio-open"; trainerPeerId: string; studentId: string }
  | { type: "private-audio-close"; trainerPeerId: string; studentId: string }
  | { type: "clip-request"; from: string; studentId: string }
  | { type: "error"; message: string };

export function canReceiveMedia(viewer: SignalRole, publisher: SignalRole) {
  if (publisher === "main_trainer") return true;
  if (publisher === "student") {
    return viewer === "main_trainer" || viewer === "secondary_trainer";
  }
  return false;
}

export function isTrainerSignalRole(role: SignalRole) {
  return role === "main_trainer" || role === "secondary_trainer";
}
