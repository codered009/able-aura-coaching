import { createServer, type IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { jwtVerify } from "jose";
import { PrismaClient } from "@prisma/client";
import {
  canReceiveMedia,
  isTrainerSignalRole,
  type SignalInbound,
  type SignalOutbound,
  type SignalPeer,
  type SignalRole,
} from "../lib/signalling-protocol";

type Client = {
  socket: WebSocket;
  peer: SignalPeer;
  sessionId: string;
};

const db = new PrismaClient();
const rooms = new Map<string, Map<string, Client>>();

function secret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? "able-aura-dev-jwt-secret-do-not-use-in-prod",
  );
}

function send(socket: WebSocket, message: SignalOutbound) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function peersIn(sessionId: string) {
  return [...(rooms.get(sessionId)?.values() ?? [])].map((c) => c.peer);
}

function roleFor(userRole: string, isMain: boolean): SignalRole {
  if (userRole === "secondary_trainer") return "secondary_trainer";
  if (userRole === "student") return "student";
  if (userRole === "parent") return "observer";
  if (userRole === "admin" || userRole === "main_trainer") {
    return isMain || userRole === "admin" ? "main_trainer" : "secondary_trainer";
  }
  return "observer";
}

async function authenticate(token: string) {
  const { payload } = await jwtVerify(token, secret());
  if (!payload.sub) throw new Error("Invalid token");
  const user = await db.user.findUnique({
    where: { id: payload.sub },
    include: { linkedStudent: true },
  });
  if (!user) throw new Error("Unknown user");
  return user;
}

async function handleJoin(socket: WebSocket, sessionId: string, token: string) {
  const user = await authenticate(token);
  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found");
  if (session.status === "ended" || session.status === "cancelled") {
    throw new Error("Session is closed");
  }

  const role = roleFor(user.role, session.mainTrainerId === user.id);
  const peer: SignalPeer = {
    peerId: `${user.id}:${Math.random().toString(36).slice(2, 8)}`,
    userId: user.id,
    name: user.name,
    role,
    studentId: user.linkedStudent?.id ?? null,
    studentName: user.linkedStudent?.name ?? null,
  };

  const room = rooms.get(sessionId) ?? new Map<string, Client>();
  rooms.set(sessionId, room);
  const client: Client = { socket, peer, sessionId };
  room.set(peer.peerId, client);

  send(socket, {
    type: "joined",
    you: peer,
    peers: peersIn(sessionId).filter((p) => p.peerId !== peer.peerId),
    status: session.status,
    exerciseId: session.currentExerciseId,
  });

  for (const other of room.values()) {
    if (other.peer.peerId === peer.peerId) continue;
    send(other.socket, { type: "peer-joined", peer });
  }

  return client;
}

function leave(client: Client | undefined) {
  if (!client) return;
  const room = rooms.get(client.sessionId);
  if (!room) return;
  room.delete(client.peer.peerId);
  for (const other of room.values()) {
    send(other.socket, { type: "peer-left", peerId: client.peer.peerId });
  }
  if (room.size === 0) rooms.delete(client.sessionId);
}

function forwardRtc(
  from: Client,
  toPeerId: string,
  message: Extract<SignalOutbound, { type: "offer" | "answer" | "ice" }>,
) {
  const room = rooms.get(from.sessionId);
  const target = room?.get(toPeerId);
  if (!target) return;
  if (message.kind === "media" && message.type === "offer") {
    if (!canReceiveMedia(target.peer.role, from.peer.role)) return;
  }
  if (message.kind === "private-audio" && !isTrainerSignalRole(from.peer.role) && !isTrainerSignalRole(target.peer.role)) {
    return;
  }
  send(target.socket, message);
}

function broadcast(
  from: Client,
  message: SignalOutbound,
  filter?: (peer: SignalPeer) => boolean,
) {
  const room = rooms.get(from.sessionId);
  if (!room) return;
  for (const other of room.values()) {
    if (other.peer.peerId === from.peer.peerId) continue;
    if (filter && !filter(other.peer)) continue;
    send(other.socket, message);
  }
}

export function startSignallingServer(port: number) {
  const httpServer = createServer((req: IncomingMessage, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server: httpServer, path: "/signal" });

  wss.on("connection", (socket) => {
    let client: Client | undefined;

    socket.on("message", async (raw) => {
      let message: SignalInbound;
      try {
        message = JSON.parse(String(raw)) as SignalInbound;
      } catch {
        send(socket, { type: "error", message: "Invalid signalling payload." });
        return;
      }

      try {
        if (message.type === "join") {
          client = await handleJoin(socket, message.sessionId, message.token);
          return;
        }
        if (!client) {
          send(socket, { type: "error", message: "Join a session first." });
          return;
        }

        if (message.type === "leave") {
          leave(client);
          client = undefined;
          return;
        }

        if (message.type === "offer" || message.type === "answer" || message.type === "ice") {
          const outbound =
            message.type === "ice"
              ? { type: "ice" as const, from: client.peer.peerId, candidate: message.candidate, kind: message.kind }
              : { type: message.type, from: client.peer.peerId, sdp: message.sdp, kind: message.kind };
          forwardRtc(client, message.to, outbound);
          return;
        }

        if (message.type === "exercise") {
          if (!isTrainerSignalRole(client.peer.role)) return;
          broadcast(client, { type: "exercise", exerciseId: message.exerciseId });
          return;
        }

        if (message.type === "session-state") {
          if (!isTrainerSignalRole(client.peer.role)) return;
          broadcast(client, { type: "session-state", status: message.status });
          return;
        }

        if (message.type === "ai-flag") {
          broadcast(client, { type: "ai-flag", event: message.event }, (peer) =>
            isTrainerSignalRole(peer.role),
          );
          return;
        }

        if (message.type === "private-audio-open") {
          if (!isTrainerSignalRole(client.peer.role)) return;
          broadcast(client, {
            type: "private-audio-open",
            trainerPeerId: client.peer.peerId,
            studentId: message.studentId,
          });
          return;
        }

        if (message.type === "private-audio-close") {
          broadcast(client, {
            type: "private-audio-close",
            trainerPeerId: client.peer.peerId,
            studentId: message.studentId,
          });
          return;
        }

        if (message.type === "clip-request") {
          if (!isTrainerSignalRole(client.peer.role)) return;
          broadcast(client, {
            type: "clip-request",
            from: client.peer.peerId,
            studentId: message.studentId,
          });
        }
      } catch (error) {
        send(socket, {
          type: "error",
          message: error instanceof Error ? error.message : "Signalling failed.",
        });
      }
    });

    socket.on("close", () => leave(client));
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Able Aura signalling on ws://0.0.0.0:${port}/signal`);
  });

  return httpServer;
}
