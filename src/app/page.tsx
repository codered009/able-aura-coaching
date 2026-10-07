import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-cream">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <p className="font-serif text-2xl text-teal-900">Able Aura</p>
        <div className="flex gap-3">
          <Link href="/team-plan.html">
            <Button variant="outline">Team plan</Button>
          </Link>
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-8 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-terracotta">
            India&apos;s coaching room for disabled children
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-teal-950 md:text-6xl">
            Live group class. Human trainers. AI that never speaks to the child.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink/70">
            Main trainers broadcast. Secondary trainers watch every camera and step in on a
            private audio line. On-device posture models flag form to the adults only — never
            as a voice in the child&apos;s ear.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button size="lg">Open the coaching desk</Button>
            </Link>
            <Link href="/login?role=student">
              <Button size="lg" variant="outline">
                Student / TV join
              </Button>
            </Link>
          </div>
        </div>
        <ul className="grid gap-4">
          {[
            ["Main trainer broadcast", "One lead stream to every child, parent observer, and TV."],
            ["Secondary trainer grid", "See student cameras and AI badges. Open private audio under 400 ms."],
            ["Eight Priority-1 movements", "High knees, running, jumping, squat, balance, catch, roll, throw."],
            ["Enrolment + subscription gate", "Only an active course enrolment and valid plan can join live."],
          ].map(([title, copy]) => (
            <li key={title} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
              <p className="font-semibold text-teal-900">{title}</p>
              <p className="mt-1 text-sm text-ink/65">{copy}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
