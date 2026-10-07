import { requirePageUser } from "@/lib/current-user";
import { getSession } from "@/lib/session-service";
import { db } from "@/lib/db";
import { SessionRoom } from "@/components/live/session-room";

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;
  const session = await getSession(id);
  const exercises = await db.exercise.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-cream px-4 py-6 md:px-8">
      <SessionRoom
        user={user}
        session={{
          id: session.id,
          title: session.title,
          status: session.status,
          joinCode: session.joinCode,
          course: { name: session.course.name },
          currentExercise: session.currentExercise
            ? {
                id: session.currentExercise.id,
                name: session.currentExercise.name,
                slug: session.currentExercise.slug,
              }
            : null,
          mainTrainer: { name: session.mainTrainer.name },
        }}
        exercises={exercises}
      />
    </div>
  );
}
