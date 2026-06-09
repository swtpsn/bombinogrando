import { NextRequest, NextResponse } from "next/server";
import {
  getLocalizedQuestion,
  getRun,
  pickAvailableQuestion,
  shuffleArray,
  updateRun,
  type Level,
} from "../../../../lib/infiniteGame";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { updateCategoryStats } from "../../../../lib/categoryStats";

type AnswerLevel = Level & {
  category_id: number;
};

async function updateUserStatsAfterCorrectAnswer(userId: string) {
  const { data: currentStats, error: readError } = await supabaseAdmin
    .from("user_stats")
    .select("total_correct")
    .eq("user_id", userId)
    .single();

  if (readError || !currentStats) {
    throw new Error(readError?.message || "Stats not found.");
  }

  const { error: updateError } = await supabaseAdmin
    .from("user_stats")
    .update({
      total_correct: currentStats.total_correct + 1,
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function updateUserStatsAfterRunFinished({
  userId,
  finalStreak,
  addWrongAnswer,
}: {
  userId: string;
  finalStreak: number;
  addWrongAnswer: boolean;
}) {
  const { data: currentStats, error: readError } = await supabaseAdmin
    .from("user_stats")
    .select("total_wrong, games_played, best_streak")
    .eq("user_id", userId)
    .single();

  if (readError || !currentStats) {
    throw new Error(readError?.message || "Stats not found.");
  }

  const { error: updateError } = await supabaseAdmin
    .from("user_stats")
    .update({
      total_wrong: currentStats.total_wrong + (addWrongAnswer ? 1 : 0),
      games_played: currentStats.games_played + 1,
      best_streak:
        finalStreak > currentStats.best_streak
          ? finalStreak
          : currentStats.best_streak,
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function getLevelById(levelId: number): Promise<AnswerLevel | null> {
  const { data, error } = await supabaseAdmin
    .from("levels_v2")
    .select("id, category_id, explanation, data")
    .eq("id", levelId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as AnswerLevel;
}

function formatQuestion(levelId: number, localizedQuestion: Awaited<ReturnType<typeof getLocalizedQuestion>>) {
  return {
    id: levelId,
    question: localizedQuestion.question,
    options: shuffleArray(localizedQuestion.options),
  };
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const runId = body.runId;
  const selectedOptionId = body.selectedOptionId;

  if (!runId || !selectedOptionId) {
    return NextResponse.json(
      { error: "runId and selectedOptionId are required" },
      { status: 400 }
    );
  }

  try {
    const run = await getRun(Number(runId));

    if (run.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (run.is_finished) {
      return NextResponse.json(
        { error: "This run is already finished." },
        { status: 400 }
      );
    }

    if (!run.current_question_id) {
      return NextResponse.json(
        { error: "Current question not found for this run." },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("allow_question_repeats, preferred_locale")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 403 }
      );
    }

    const allowQuestionRepeats =
      profile.allow_question_repeats === true;

    const locale = profile.preferred_locale || "ru";

    const level = await getLevelById(Number(run.current_question_id));

    if (!level) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const localizedQuestion = await getLocalizedQuestion({
      level,
      locale,
    });

    const isCorrect =
      selectedOptionId === localizedQuestion.correctOptionId;

    if (!isCorrect) {
      await updateRun(Number(runId), {
        is_finished: true,
        updated_at: new Date().toISOString(),
      });

      await updateUserStatsAfterRunFinished({
        userId: user.id,
        finalStreak: run.streak,
        addWrongAnswer: true,
      });

      await updateCategoryStats({
        userId: user.id,
        categoryId: Number(level.category_id),
        isCorrect: false,
        streak: run.streak,
      });

      const correctOption = localizedQuestion.options.find(
        (option) => option.id === localizedQuestion.correctOptionId
      );

      return NextResponse.json({
        isCorrect: false,
        gameOver: true,
        correctAnswer: correctOption?.text || "",
        explanation: localizedQuestion.explanation,
        finalStreak: run.streak,
      });
    }

    const newStreak = run.streak + 1;

    await updateCategoryStats({
      userId: user.id,
      categoryId: Number(level.category_id),
      isCorrect: true,
      streak: newStreak,
    });

    await updateUserStatsAfterCorrectAnswer(user.id);

    let nextLevel: AnswerLevel | null = null;

    if (run.next_question_id) {
      nextLevel = await getLevelById(Number(run.next_question_id));
    }

    if (!nextLevel) {
      const pickedLevel = await pickAvailableQuestion({
      userId: user.id,
      categoryId: run.category_id,
      excludeLevelId: level.id,
      allowQuestionRepeats,
      markAsSeen: false,
    });

    nextLevel = pickedLevel as AnswerLevel | null;
    }

    if (!nextLevel) {
      await updateRun(Number(runId), {
        streak: newStreak,
        is_finished: true,
        next_question_id: null,
        updated_at: new Date().toISOString(),
      });

      await updateUserStatsAfterRunFinished({
        userId: user.id,
        finalStreak: newStreak,
        addWrongAnswer: false,
      });

      return NextResponse.json({
        isCorrect: true,
        gameOver: true,
        explanation: localizedQuestion.explanation,
        finalStreak: newStreak,
        message: "No more unseen questions in this category.",
      });
    }

    await supabaseAdmin
      .from("user_seen_questions")
      .upsert({
        user_id: user.id,
        level_id: nextLevel.id,
      });

    const pickedPrefetchedLevel = await pickAvailableQuestion({
      userId: user.id,
      categoryId: run.category_id,
      excludeLevelId: nextLevel.id,
      allowQuestionRepeats,
      markAsSeen: false,
    });

    const prefetchedLevel = pickedPrefetchedLevel as AnswerLevel | null;

    const localizedNextQuestion = await getLocalizedQuestion({
      level: nextLevel,
      locale,
    });

    const localizedPrefetchedQuestion = prefetchedLevel
      ? await getLocalizedQuestion({
          level: prefetchedLevel,
          locale,
        })
      : null;

    await updateRun(Number(runId), {
      streak: newStreak,
      current_question_id: nextLevel.id,
      next_question_id: prefetchedLevel?.id || null,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      isCorrect: true,
      gameOver: false,
      explanation: localizedQuestion.explanation,
      streak: newStreak,
      nextQuestion: formatQuestion(nextLevel.id, localizedNextQuestion),
      prefetchedQuestion:
        prefetchedLevel && localizedPrefetchedQuestion
          ? formatQuestion(prefetchedLevel.id, localizedPrefetchedQuestion)
          : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check answer.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}