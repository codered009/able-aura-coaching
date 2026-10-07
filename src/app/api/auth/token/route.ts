import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const token = (await cookies()).get("aa_session")?.value ?? null;
  return NextResponse.json({ token, user });
}
