import { supabaseAdmin } from "./supabaseAdmin";

export type LevelData = {
  question: string;
  options: string[];
  correct: string;
};

export type Level = {
  id: number;
  category_id?: number;
  explanation?: string | null;
  data: LevelData;
};

export type LocalizedOption = {
  id: string;
  text: string;
};

export type LocalizedQuestion = {
  levelId: number;
  question: string;
  options: LocalizedOption[];
  correctOptionId: string;
  explanation: string;
};

type LevelTranslation = {
  level_id: number;
  locale: string;
  question: string;
  options: LocalizedOption[];
  correct_option_id: string;
  explanation: string;
};

export function shuffleArray<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function getRandomItem<T>(items: T[]) {
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}

export async function getSeenLevelIds(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_seen_questions")
    .select("level_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data || []).map((item) => item.level_id));
}

export async function markQuestionAsSeen(
  userId: string,
  levelId: number
) {
  const { error } = await supabaseAdmin
    .from("user_seen_questions")
    .upsert({
      user_id: userId,
      level_id: levelId,
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getPreferredLocale(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("preferred_locale")
    .eq("id", userId)
    .single();

  if (error || !data?.preferred_locale) {
    return "ru";
  }

  return data.preferred_locale;
}

export async function getLocalizedQuestion({
  level,
  locale,
}: {
  level: Level;
  locale: string;
}): Promise<LocalizedQuestion> {
  const { data: translation } = await supabaseAdmin
    .from("level_translations")
    .select("level_id, locale, question, options, correct_option_id, explanation")
    .eq("level_id", level.id)
    .eq("locale", locale)
    .single();

  if (translation) {
    const localized = translation as LevelTranslation;

    return {
      levelId: level.id,
      question: localized.question,
      options: localized.options,
      correctOptionId: localized.correct_option_id,
      explanation: localized.explanation,
    };
  }

  const fallbackOptions = level.data.options.map((text, index) => ({
    id: `option_${index + 1}`,
    text,
  }));

  const correctIndex = level.data.options.findIndex(
    (option) => option === level.data.correct
  );

  return {
    levelId: level.id,
    question: level.data.question,
    options: fallbackOptions,
    correctOptionId:
      correctIndex >= 0 ? `option_${correctIndex + 1}` : "unknown",
    explanation: level.explanation || "",
  };
}

export async function pickAvailableQuestion({
  userId,
  categoryId,
  excludeLevelId,
  allowQuestionRepeats,
  markAsSeen = true,
}: {
  userId: string;
  categoryId: number;
  excludeLevelId?: number;
  allowQuestionRepeats: boolean;
  markAsSeen?: boolean;
}) {
  let query = supabaseAdmin
    .from("levels_v2")
    .select("id, category_id, explanation, data")
    .eq("category_id", categoryId)
    .eq("is_active", true);

  if (excludeLevelId) {
    query = query.neq("id", excludeLevelId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let levels = (data || []) as Level[];

  if (!allowQuestionRepeats) {
    const seenLevelIds = await getSeenLevelIds(userId);

    levels = levels.filter(
      (level) => !seenLevelIds.has(level.id)
    );
  }

  if (levels.length === 0) {
    return null;
  }

  const selectedLevel = getRandomItem(levels);

  if (markAsSeen) {
    await markQuestionAsSeen(userId, selectedLevel.id);
  }

  return selectedLevel;
}

export async function getRun(runId: number) {
  const { data, error } = await supabaseAdmin
    .from("game_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateRun(
  runId: number,
  values: Record<string, unknown>
) {
  const { error } = await supabaseAdmin
    .from("game_runs")
    .update(values)
    .eq("id", runId);

  if (error) {
    throw new Error(error.message);
  }
}