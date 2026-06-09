import { supabaseAdmin } from "./supabaseAdmin";
import {
  getLocalizedQuestion,
  markQuestionAsSeen,
  shuffleArray,
  type Level,
} from "./infiniteGame";

const DAILY_QUESTION_COUNT = 10;

export function getTodayDailyDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getOrCreateTodayChallenge() {
  const challengeDate = getTodayDailyDate();

  const { data, error } = await supabaseAdmin
    .from("daily_challenges")
    .upsert(
      {
        challenge_date: challengeDate,
        is_active: true,
      },
      {
        onConflict: "challenge_date",
      }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create daily challenge.");
  }

  return data;
}

export async function pickDailyLevels({
  userId,
  hasPremiumAccess,
}: {
  userId: string;
  hasPremiumAccess: boolean;
}) {
  let query = supabaseAdmin
    .from("levels_v2")
    .select(`
      id,
      category_id,
      explanation,
      data,
      categories!inner (
        is_premium
      )
    `)
    .eq("is_active", true)
    .limit(300);

  if (!hasPremiumAccess) {
    query = query.eq("categories.is_premium", false);
  }

  const { data: levelsData, error: levelsError } = await query;

  if (levelsError) {
    throw new Error(levelsError.message);
  }

  const { data: seenData, error: seenError } = await supabaseAdmin
    .from("user_seen_questions")
    .select("level_id")
    .eq("user_id", userId);

  if (seenError) {
    throw new Error(seenError.message);
  }

  const seenIds = new Set((seenData || []).map((item) => item.level_id));

  const availableLevels = ((levelsData || []) as unknown as Level[])
    .filter((level) => !seenIds.has(level.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, DAILY_QUESTION_COUNT);

  return availableLevels;
}

export async function createDailyAttemptQuestions({
  attemptId,
  userId,
  levels,
}: {
  attemptId: number;
  userId: string;
  levels: Level[];
}) {
  const rows = levels.map((level, index) => ({
    attempt_id: attemptId,
    level_id: level.id,
    position: index + 1,
  }));

  const { error } = await supabaseAdmin
    .from("daily_challenge_attempt_questions")
    .insert(rows);

  if (error) {
    throw new Error(error.message);
  }

  for (const level of levels) {
    await markQuestionAsSeen(userId, level.id);
  }
}

export async function formatDailyQuestion({
  level,
  locale,
}: {
  level: Level;
  locale: string;
}) {
  const localizedQuestion = await getLocalizedQuestion({
    level,
    locale,
  });

  return {
    id: localizedQuestion.levelId,
    question: localizedQuestion.question,
    options: shuffleArray(localizedQuestion.options),
  };
}

export async function getDailyQuestionByPosition({
  attemptId,
  position,
  locale,
}: {
  attemptId: number;
  position: number;
  locale: string;
}) {
  const { data: attemptQuestion, error: attemptQuestionError } =
    await supabaseAdmin
      .from("daily_challenge_attempt_questions")
      .select("id, level_id, position, selected_option_id, is_correct")
      .eq("attempt_id", attemptId)
      .eq("position", position)
      .single();

  if (attemptQuestionError || !attemptQuestion) {
    return null;
  }

  const { data: level, error: levelError } = await supabaseAdmin
    .from("levels_v2")
    .select("id, category_id, explanation, data")
    .eq("id", attemptQuestion.level_id)
    .eq("is_active", true)
    .single();

  if (levelError || !level) {
    return null;
  }

  const question = await formatDailyQuestion({
    level,
    locale,
  });

  return {
    attemptQuestion,
    level: level as Level,
    question,
  };
}