"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getDictionary } from "../../lib/i18n/getDictionary";

type UserStats = {
  total_correct: number;
  total_wrong: number;
  best_streak: number;
  games_played: number;
};

type Profile = {
  nickname: string;
  role: string;
  is_premium: boolean;
  can_change_nickname: boolean;
  preferred_locale: string;
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

type CategoryStats = {
  id: number;
  user_id: string;
  category_id: number;
  correct_answers: number;
  wrong_answers: number;
  best_streak: number;
};

export default function ProfilePage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [originalNickname, setOriginalNickname] = useState("");
  const [message, setMessage] = useState("");
  const [selectedLocale, setSelectedLocale] = useState("ru");
  const [loading, setLoading] = useState(true);

  const t = getDictionary(profile?.preferred_locale || "ru");
  console.log("LOCALE", profile?.preferred_locale);
  console.log("RUSSIAN", t.profile.russian);
  console.log("ENGLISH", t.profile.english);
  console.log("PROFILE", t.profile);

  const canEditNickname =
    profile?.role === "admin" ||
    profile?.is_premium === true ||
    profile?.can_change_nickname === true;

  const totalAnswers =
    (stats?.total_correct || 0) + (stats?.total_wrong || 0);

  const accuracy =
    totalAnswers > 0
      ? Math.round(((stats?.total_correct || 0) / totalAnswers) * 100)
      : 0;

  const favoriteCategory = useMemo(() => {
    if (categoryStats.length === 0) return null;

    const sorted = [...categoryStats].sort((a, b) => {
      const aTotal = a.correct_answers + a.wrong_answers;
      const bTotal = b.correct_answers + b.wrong_answers;
      return bTotal - aTotal;
    });

    return sorted[0];
  }, [categoryStats]);

  function getCategoryName(categoryId: number) {
    const category = categories.find((item) => item.id === categoryId);
    return category?.name || "Неизвестная категория";
  }

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("nickname, role, is_premium, can_change_nickname, preferred_locale")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error(profileError);
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setNickname(profileData.nickname);
      setOriginalNickname(profileData.nickname);
      setSelectedLocale(profileData.preferred_locale || "ru");

      const { data: statsData, error: statsError } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (statsError) {
        console.error(statsError);
        setLoading(false);
        return;
      }

      setStats(statsData);

      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");

      setCategories(categoriesData || []);

      const { data: categoryStatsData, error: categoryStatsError } =
        await supabase
          .from("user_category_stats")
          .select("*")
          .eq("user_id", user.id)
          .order("best_streak", { ascending: false });

      if (categoryStatsError) {
        console.error(categoryStatsError);
      } else {
        setCategoryStats(categoryStatsData || []);
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleSaveLanguage() {
    if (!userId || !profile) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        preferred_locale: selectedLocale,
      })
      .eq("id", userId);

    if (error) {
      console.error(error);
      setMessage(t.profile.languageSaveError);
      return;
    }

    setProfile({
      ...profile,
      preferred_locale: selectedLocale,
    });

    setMessage(t.profile.languageSaved);
  }

  async function handleSaveNickname() {
    if (!userId || !profile) return;

    if (!canEditNickname) {
      setMessage("У вас нет прав на изменение никнейма.");
      return;
    }

    const cleanNickname = nickname.trim();

    if (!cleanNickname) {
      setMessage("Никнейм не может быть пустым.");
      return;
    }

    if (cleanNickname.toLowerCase() === originalNickname.toLowerCase()) {
      setMessage("Никнейм не изменился.");
      return;
    }

    setMessage("Проверяем никнейм...");

    const { data: existingProfiles, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("nickname", cleanNickname)
      .neq("id", userId)
      .limit(1);

    if (checkError) {
      setMessage(checkError.message);
      return;
    }

    if (existingProfiles && existingProfiles.length > 0) {
      setMessage("Этот никнейм уже занят.");
      return;
    }

    setMessage("Сохраняем...");

    const { error } = await supabase
      .from("profiles")
      .update({
        nickname: cleanNickname,
        can_change_nickname: false,
      })
      .eq("id", userId);

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        setMessage("Этот никнейм уже занят.");
        return;
      }

      setMessage("Не удалось сохранить никнейм.");
      return;
    }

    setOriginalNickname(cleanNickname);
    setNickname(cleanNickname);
    setProfile({
      ...profile,
      nickname: cleanNickname,
      can_change_nickname: false,
    });

    setMessage("Никнейм сохранён.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        {t.common.loading}
      </main>
    );
  }

  if (!email) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Вы не вошли в аккаунт.
      </main>
    );
  }

  if (!stats || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Данные профиля не найдены.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            {t.profile.title}
          </p>

          <h1 className="text-4xl font-black tracking-tight">
            {originalNickname}
          </h1>

          <p className="mt-2 text-zinc-400">{email}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300">
              Роль: {profile.role}
            </span>

            {profile.is_premium && (
              <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-300">
                Premium
              </span>
            )}

            {canEditNickname && (
              <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-sm text-blue-300">
                Можно изменить никнейм
              </span>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <label className="mb-2 block text-sm font-medium text-zinc-400">
            {t.profile.nickname}
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={!canEditNickname}
              placeholder="Введите никнейм"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            />

            <button
              onClick={handleSaveNickname}
              disabled={!canEditNickname}
              className="rounded-xl bg-white px-5 py-3 font-bold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {t.common.save}
            </button>
          </div>

          {!canEditNickname && (
            <p className="mt-3 text-sm text-zinc-500">
              Изменение никнейма заблокировано. Нужен статус администратора, премиум или отдельное разрешение.
            </p>
          )}

          {message && <p className="mt-3 text-sm text-zinc-400">{message}</p>}
        </div>

        <div className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <label className="mb-2 block text-sm font-medium text-zinc-400">
            {t.profile.language}
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
           
          <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-zinc-700 bg-zinc-950 p-1">
            <button
              type="button"
              onClick={() => setSelectedLocale("ru")}
              className={`rounded-lg px-4 py-3 font-bold transition ${
                selectedLocale === "ru"
                  ? "bg-white text-zinc-950"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t.profile.russian}
            </button>

            <button
              type="button"
              onClick={() => setSelectedLocale("en")}
              className={`rounded-lg px-4 py-3 font-bold transition ${
                selectedLocale === "en"
                  ? "bg-white text-zinc-950"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t.profile.english}
            </button>
          </div>

            <button
              onClick={handleSaveLanguage}
              className="rounded-xl bg-white px-5 py-3 font-bold text-zinc-950 transition hover:bg-zinc-200"
            >
              {t.common.save}
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard value={stats.total_correct} label={t.profile.correctAnswers} color="text-emerald-300" />
          <StatCard value={stats.total_wrong} label={t.profile.wrongAnswers} color="text-red-300" />
          <StatCard value={stats.best_streak} label={t.profile.bestStreak} color="text-yellow-300" />
          <StatCard value={stats.games_played} label={t.profile.gamesPlayed} color="text-blue-300" />
          <StatCard value={totalAnswers} label={t.profile.totalAnswers} color="text-purple-300" />
          <StatCard value={`${accuracy}%`} label={t.profile.accuracy} color="text-cyan-300" />
        </div>

        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-2xl font-bold">{t.profile.highlights}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">{t.profile.favoriteCategory}</p>
              <p className="mt-2 text-2xl font-black">
                {favoriteCategory
                  ? getCategoryName(favoriteCategory.category_id)
                  : t.profile.notEnoughData}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">{t.profile.bestCategoryStreak}</p>
              <p className="mt-2 text-2xl font-black text-yellow-300">
                {categoryStats.length > 0
                  ? Math.max(...categoryStats.map((item) => item.best_streak))
                  : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-6 text-2xl font-bold">{t.profile.categoryStats}</h2>

          {categoryStats.length === 0 ? (
            <p className="text-zinc-400">
              Пока нет статистики по категориям. Сыграйте в бесконечный режим, чтобы собрать данные.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {categoryStats.map((item) => {
                const categoryTotal =
                  item.correct_answers + item.wrong_answers;

                const categoryAccuracy =
                  categoryTotal > 0
                    ? Math.round((item.correct_answers / categoryTotal) * 100)
                    : 0;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                  >
                    <h3 className="text-xl font-bold">
                      {getCategoryName(item.category_id)}
                    </h3>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <MiniStat label="Верно" value={item.correct_answers} color="text-emerald-300" />
                      <MiniStat label="Ошибки" value={item.wrong_answers} color="text-red-300" />
                      <MiniStat label="Лучший стрик" value={item.best_streak} color="text-yellow-300" />
                      <MiniStat label="Точность" value={`${categoryAccuracy}%`} color="text-cyan-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
      <p className={`text-4xl font-black ${color}`}>
        {value}
      </p>
      <p className="mt-2 text-zinc-400">{label}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div>
      <p className="text-zinc-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}