import { supabaseAdmin } from "./supabaseAdmin";

export async function updateCategoryStats({
  userId,
  categoryId,
  isCorrect,
  streak,
}: {
  userId: string;
  categoryId: number;
  isCorrect: boolean;
  streak: number;
}) {
  const { data: stats } = await supabaseAdmin
    .from("user_category_stats")
    .select("*")
    .eq("user_id", userId)
    .eq("category_id", categoryId)
    .single();

  if (!stats) {
    await supabaseAdmin
      .from("user_category_stats")
      .insert({
        user_id: userId,
        category_id: categoryId,
        correct_answers: isCorrect ? 1 : 0,
        wrong_answers: isCorrect ? 0 : 1,
        best_streak: isCorrect ? streak : 0,
      });

    return;
  }

  await supabaseAdmin
    .from("user_category_stats")
    .update({
      correct_answers:
        stats.correct_answers + (isCorrect ? 1 : 0),

      wrong_answers:
        stats.wrong_answers + (isCorrect ? 0 : 1),

      best_streak:
        streak > stats.best_streak
          ? streak
          : stats.best_streak,

      updated_at: new Date().toISOString(),
    })
    .eq("id", stats.id);
}