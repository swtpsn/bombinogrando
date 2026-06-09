import { NextRequest, NextResponse } from "next/server";
import { getLocalizedQuestion, type Level } from "../../../../lib/infiniteGame";
import { getDailyQuestionByPosition, formatDailyQuestion, getTodayDailyDate } from "../../../../lib/dailyChallenge";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const DAILY_QUESTION_COUNT = 10;
const REWARD_MIN_SCORE = 6;

async function updateUserDailyStats(userId: string) {
  const today = getTodayDailyDate();

  const yesterday = new Date(`${today}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(yesterday);

  const { data: existingStats } = await supabaseAdmin
    .from("user_daily_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!existingStats) {
    await supabaseAdmin.from("user_daily_stats").insert({
      user_id: userId,
      current_streak: 1,
      best_streak: 1,
      last_completed_date: today,
    });

    return;
  }

  if (existingStats.last_completed_date === today) {
    return;
  }

  const nextStreak =
    existingStats.last_completed_date === yesterdayString
      ? existingStats.current_streak + 1
      : 1;

  await supabaseAdmin
    .from("user_daily_stats")
    .update({
      current_streak: nextStreak,
      best_streak:
        nextStreak > existingStats.best_streak
          ? nextStreak
          : existingStats.best_streak,
      last_completed_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

async function getLevelById(levelId: number): Promise<Level | null> {
  const { data, error } = await supabaseAdmin
    .from("levels_v2")
    .select("id, category_id, explanation, data")
    .eq("id", levelId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Level;
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

  const attemptId = body.attemptId;
  const selectedOptionId = body.selectedOptionId;

  if (!attemptId || !selectedOptionId) {
    return NextResponse.json(
      { error: "attemptId and selectedOptionId are required" },
      { status: 400 }
    );
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("preferred_locale")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 403 }
      );
    }

    const locale = profile.preferred_locale || "ru";

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("daily_challenge_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Daily attempt not found." },
        { status: 404 }
      );
    }

    if (attempt.is_completed) {
      return NextResponse.json(
        { error: "Daily challenge is already completed." },
        { status: 400 }
      );
    }

    const nextPosition = attempt.current_position + 1;

    const { data: attemptQuestion, error: attemptQuestionError } =
      await supabaseAdmin
        .from("daily_challenge_attempt_questions")
        .select("*")
        .eq("attempt_id", attempt.id)
        .eq("position", nextPosition)
        .single();

    if (attemptQuestionError || !attemptQuestion) {
      return NextResponse.json(
        { error: "Daily question not found." },
        { status: 404 }
      );
    }

    if (attemptQuestion.selected_option_id) {
        const { data: freshAttempt } = await supabaseAdmin
          .from("daily_challenge_attempts")
          .select("*")
          .eq("id", attempt.id)
          .single();
      
        if (!freshAttempt) {
          return NextResponse.json(
            { error: "Daily attempt not found." },
            { status: 404 }
          );
        }
      
        if (freshAttempt.is_completed) {
          return NextResponse.json({
            isCompleted: true,
            score: freshAttempt.score,
            totalQuestions: DAILY_QUESTION_COUNT,
            bestStreak: freshAttempt.best_streak,
            rewardEligible: freshAttempt.reward_eligible,
          });
        }
      
        const nextData = await getDailyQuestionByPosition({
          attemptId: attempt.id,
          position: freshAttempt.current_position + 1,
          locale,
        });
      
        const prefetchedData = await getDailyQuestionByPosition({
          attemptId: attempt.id,
          position: freshAttempt.current_position + 2,
          locale,
        });
      
        if (!nextData) {
          return NextResponse.json(
            { error: "Next daily question not found." },
            { status: 404 }
          );
        }
      
        return NextResponse.json({
          isCorrect: attemptQuestion.is_correct,
          isCompleted: false,
          score: freshAttempt.score,
          currentPosition: freshAttempt.current_position,
          totalQuestions: DAILY_QUESTION_COUNT,
          bestStreak: freshAttempt.best_streak,
          currentStreak: freshAttempt.current_streak,
          explanation: "",
          nextQuestion: nextData.question,
          prefetchedQuestion: prefetchedData?.question || null,
        });
    }

    const level = await getLevelById(Number(attemptQuestion.level_id));

    if (!level) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 }
      );
    }

    const localizedQuestion = await getLocalizedQuestion({
      level,
      locale,
    });

    const isCorrect =
      selectedOptionId === localizedQuestion.correctOptionId;

    const newScore = attempt.score + (isCorrect ? 1 : 0);
    const newCurrentStreak = isCorrect ? attempt.current_streak + 1 : 0;
    const newBestStreak =
      newCurrentStreak > attempt.best_streak
        ? newCurrentStreak
        : attempt.best_streak;

    await supabaseAdmin
      .from("daily_challenge_attempt_questions")
      .update({
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
      })
      .eq("id", attemptQuestion.id);

    const isCompleted = nextPosition >= DAILY_QUESTION_COUNT;

    await supabaseAdmin
      .from("daily_challenge_attempts")
      .update({
        current_position: nextPosition,
        score: newScore,
        current_streak: newCurrentStreak,
        best_streak: newBestStreak,
        is_completed: isCompleted,
        reward_eligible: isCompleted && newScore >= REWARD_MIN_SCORE,
        finished_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);

    if (isCompleted) {
      await updateUserDailyStats(user.id);

      return NextResponse.json({
        isCorrect,
        isCompleted: true,
        score: newScore,
        totalQuestions: DAILY_QUESTION_COUNT,
        bestStreak: newBestStreak,
        rewardEligible: newScore >= REWARD_MIN_SCORE,
        explanation: localizedQuestion.explanation,
      });
    }

    const { data: nextAttemptQuestion, error: nextAttemptQuestionError } =
      await supabaseAdmin
        .from("daily_challenge_attempt_questions")
        .select("*")
        .eq("attempt_id", attempt.id)
        .eq("position", nextPosition + 1)
        .single();

    if (nextAttemptQuestionError || !nextAttemptQuestion) {
      return NextResponse.json(
        { error: "Next daily question not found." },
        { status: 404 }
      );
    }

    const nextLevel = await getLevelById(Number(nextAttemptQuestion.level_id));

    if (!nextLevel) {
      return NextResponse.json(
        { error: "Next question not found." },
        { status: 404 }
      );
    }

    const nextQuestion = await formatDailyQuestion({
      level: nextLevel,
      locale,
    });

    const prefetchedData = await getDailyQuestionByPosition({
        attemptId: attempt.id,
        position: nextPosition + 2,
        locale,
    });

    return NextResponse.json({
      isCorrect,
      isCompleted: false,
      score: newScore,
      currentPosition: nextPosition,
      totalQuestions: DAILY_QUESTION_COUNT,
      bestStreak: newBestStreak,
      currentStreak: newCurrentStreak,
      explanation: localizedQuestion.explanation,
      nextQuestion,
      prefetchedQuestion: prefetchedData?.question || null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to answer daily question.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}