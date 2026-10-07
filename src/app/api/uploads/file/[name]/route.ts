import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const name = (await context.params).name;
  if (name.includes("..") || name.includes("/")) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }
  try {
    const file = await readFile(path.join(process.cwd(), "data", "uploads", name));
    return new NextResponse(file, {
      headers: { "content-type": "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
