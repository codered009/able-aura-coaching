import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

export async function jsonHandler(
  request: Request,
  handler: (ctx: { user: AuthUser | null; request: Request }) => Promise<unknown>,
  opts?: { auth?: boolean },
) {
  try {
    const user = await getSessionUser();
    if (opts?.auth !== false && !user) {
      return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    }
    const data = await handler({ user, request });
    return NextResponse.json(data);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : "Request failed.";
    const status =
      name === "UnauthorizedError"
        ? 401
        : name === "ForbiddenError"
          ? 403
          : name === "NotFoundError"
            ? 404
            : name === "AuthError" || name === "SessionServiceError"
              ? 400
              : 500;
    if (status === 500) console.error(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export function requireActor(user: AuthUser | null): AuthUser {
  if (!user) {
    const error = new Error("Sign in to continue.");
    error.name = "UnauthorizedError";
    throw error;
  }
  return user;
}
