import { requirePageUser } from "@/lib/current-user";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";

export default async function CoursesPage() {
  const user = await requirePageUser();
  const courses = await db.course.findMany({
    include: { enrollments: { include: { student: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <AppShell user={user}>
      <h1 className="font-serif text-4xl text-teal-950">Courses</h1>
      <p className="mt-2 text-ink/60">
        Live sessions always carry a course_id. Join checks an active enrolment on that course.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <Card key={course.id}>
            <p className="font-semibold">{course.name}</p>
            <p className="mt-1 text-sm text-ink/60">{course.description}</p>
            <ul className="mt-3 text-sm">
              {course.enrollments.map((enrollment) => (
                <li key={enrollment.id}>
                  {enrollment.student.name} — {enrollment.status}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
