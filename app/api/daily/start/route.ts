import { NextRequest, NextResponse } from "next/server";
import {
  createDailyAttemptQuestions,
  formatDailyQuestion,
  getDailyQuestionByPosition,
  getOrCreateTodayChallenge,
  pickDailyLevels,
} from "../../../../lib/dailyChallenge";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

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

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, is_premium, preferred_locale")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 403 }
      );
    }

    const locale = profile.preferred_locale || "ru";

    const hasPremiumAccess =
      profile.role === "admin" || profile.is_premium === true;

    const challenge = await getOrCreateTodayChallenge();

    const { data: existingAttempt, error: existingAttemptError } =
      await supabaseAdmin
        .from("daily_challenge_attempts")
        .select("*")
        .eq("user_id", user.id)
        .eq("daily_challenge_id", challenge.id)
        .single();

    if (existingAttemptError && existingAttemptError.code !== "PGRST116") {
      return NextResponse.json(
        { error: existingAttemptError.message },
        { status: 500 }
      );
    }

    if (existingAttempt?.is_completed) {
      return NextResponse.json({
        alreadyCompleted: true,
        challengeDate: challenge.challenge_date,
        score: existingAttempt.score,
        bestStreak: existingAttempt.best_streak,
      });
    }

    let attempt = existingAttempt;

    if (!attempt) {
      const levels = await pickDailyLevels({
        userId: user.id,
        hasPremiumAccess,
      });

      if (levels.length === 0) {
        return NextResponse.json(
          { error: "No available questions for today's challenge." },
          { status: 404 }
        );
      }

      const { data: createdAttempt, error: createAttemptError } =
        await supabaseAdmin
          .from("daily_challenge_attempts")
          .insert({
            user_id: user.id,
            daily_challenge_id: challenge.id,
            current_position: 0,
            score: 0,
            best_streak: 0,
            current_streak: 0,
            is_completed: false,
          })
          .select("*")
          .single();

      if (createAttemptError || !createdAttempt) {
        return NextResponse.json(
          {
            error:
              createAttemptError?.message ||
              "Failed to create daily attempt.",
          },
          { status: 500 }
        );
      }

      await createDailyAttemptQuestions({
        attemptId: createdAttempt.id,
        userId: user.id,
        levels,
      });

      attempt = createdAttempt;
    }

    const { data: attemptQuestion, error: attemptQuestionError } =
      await supabaseAdmin
        .from("daily_challenge_attempt_questions")
        .select("id, level_id, position, selected_option_id, is_correct")
        .eq("attempt_id", attempt.id)
        .eq("position", attempt.current_position + 1)
        .single();

    if (attemptQuestionError || !attemptQuestion) {
      return NextResponse.json(
        { error: "Daily question not found." },
        { status: 404 }
      );
    }

    const { data: level, error: levelError } = await supabaseAdmin
      .from("levels_v2")
      .select("id, category_id, explanation, data")
      .eq("id", attemptQuestion.level_id)
      .eq("is_active", true)
      .single();

    if (levelError || !level) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 }
      );
    }

    const question = await formatDailyQuestion({
      level,
      locale,
    });

    const prefetchedData = await getDailyQuestionByPosition({
     attemptId: attempt.id,
     position: attempt.current_position + 2,
     locale,
    });

    return NextResponse.json({
      alreadyCompleted: false,
      challengeDate: challenge.challenge_date,
      attemptId: attempt.id,
      currentPosition: attempt.current_position,
      totalQuestions: 10,
      score: attempt.score,
      bestStreak: attempt.best_streak,
      currentStreak: attempt.current_streak,
      question,
      prefetchedQuestion: prefetchedData?.question || null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start daily challenge.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}