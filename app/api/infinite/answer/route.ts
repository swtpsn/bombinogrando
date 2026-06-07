import { NextRequest, NextResponse } from "next/server";
import {
  getRun,
  pickAvailableQuestion,
  shuffleArray,
  updateRun,
} from "../../../../lib/infiniteGame";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

type LevelData = {
  question: string;
  options: string[];
  correct: string;
};

type Level = {
  id: number;
  category_id: number;
  explanation: string | null;
  data: LevelData;
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
  const selectedOption = body.selectedOption;

  if (!runId || !selectedOption) {
    return NextResponse.json(
      { error: "runId and selectedOption are required" },
      { status: 400 }
    );
  }

  try {
    const run = await getRun(Number(runId));

    if (run.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
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
      .select("allow_question_repeats")
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

    const { data: currentLevel, error: levelError } = await supabaseAdmin
      .from("levels_v2")
      .select("id, category_id, explanation, data")
      .eq("id", run.current_question_id)
      .eq("is_active", true)
      .single();

    if (levelError || !currentLevel) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const level = currentLevel as Level;
    const isCorrect = selectedOption === level.data.correct;

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

      return NextResponse.json({
        isCorrect: false,
        gameOver: true,
        correctAnswer: level.data.correct,
        explanation: level.explanation,
        finalStreak: run.streak,
      });
    }

    const newStreak = run.streak + 1;

    await updateUserStatsAfterCorrectAnswer(user.id);

    const nextLevel = await pickAvailableQuestion({
      userId: user.id,
      categoryId: run.category_id,
      excludeLevelId: level.id,
      allowQuestionRepeats,
    });

    if (!nextLevel) {
      await updateRun(Number(runId), {
        streak: newStreak,
        is_finished: true,
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
        explanation: level.explanation,
        finalStreak: newStreak,
        message: "No more unseen questions in this category.",
      });
    }

    await updateRun(Number(runId), {
      streak: newStreak,
      current_question_id: nextLevel.id,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      isCorrect: true,
      gameOver: false,
      explanation: level.explanation,
      streak: newStreak,
      nextQuestion: {
        id: nextLevel.id,
        question: nextLevel.data.question,
        options: shuffleArray(nextLevel.data.options),
      },
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