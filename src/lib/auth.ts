import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { AuthUser, Role } from "@/lib/types";

const COOKIE = "aa_session";
const OTP_TTL_MS = 5 * 60 * 1000;

function secret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? "able-aura-dev-jwt-secret-do-not-use-in-prod",
  );
}

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export async function requestOtp(phoneInput: string) {
  const phone = normalizePhone(phoneInput);
  const user = await db.user.findUnique({
    where: { phone },
    include: { linkedStudent: true },
  });
  if (!user) {
    const error = new Error("No Able Aura account uses this mobile number.");
    error.name = "NotFoundError";
    throw error;
  }

  const devCode = process.env.OTP_DEV_CODE ?? "123456";
  const code =
    process.env.NODE_ENV === "production"
      ? String(Math.floor(100000 + Math.random() * 900000))
      : devCode;
  const codeHash = await hash(code, 8);

  await db.otpChallenge.create({
    data: {
      userId: user.id,
      phone,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return {
    phone,
    name: user.name,
    role: user.role,
    demoCode: process.env.NODE_ENV === "production" ? undefined : code,
  };
}

export async function verifyOtp(phoneInput: string, code: string) {
  const phone = normalizePhone(phoneInput);
  const user = await db.user.findUnique({
    where: { phone },
    include: { linkedStudent: true },
  });
  if (!user) {
    const error = new Error("No Able Aura account uses this mobile number.");
    error.name = "NotFoundError";
    throw error;
  }

  const challenge = await db.otpChallenge.findFirst({
    where: { userId: user.id, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) {
    const error = new Error("The OTP has expired. Request a new one.");
    error.name = "AuthError";
    throw error;
  }

  const ok = await compare(code, challenge.codeHash);
  if (!ok) {
    const error = new Error("That OTP does not match.");
    error.name = "AuthError";
    throw error;
  }

  await db.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  const authUser = toAuthUser(user);
  const token = await new SignJWT({
    sub: user.id,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return { ...authUser, token };
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      include: { linkedStudent: true },
    });
    if (!user) return null;
    return toAuthUser(user);
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    const error = new Error("Sign in to continue.");
    error.name = "UnauthorizedError";
    throw error;
  }
  return user;
}

export function toAuthUser(user: {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string | null;
  linkedStudent?: { id: string } | null;
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role as Role,
    phone: user.phone,
    email: user.email,
    studentId: user.linkedStudent?.id ?? null,
  };
}
