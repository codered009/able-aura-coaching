import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { can, type Action } from "@/lib/permissions";

export async function requirePageUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePageAction(action: Action) {
  const user = await requirePageUser();
  if (!can(user, action)) redirect("/dashboard");
  return user;
}
