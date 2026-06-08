"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  const [loading, setLoading] = useState(true);

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
    return category?.name || "Unknown category";
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
        .select("nickname, role, is_premium, can_change_nickname")
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

  async function handleSaveNickname() {
    if (!userId || !profile) return;

    if (!canEditNickname) {
      setMessage("You do not have permission to change your nickname.");
      return;
    }

    const cleanNickname = nickname.trim();

    if (!cleanNickname) {
      setMessage("Nickname cannot be empty.");
      return;
    }

    if (cleanNickname.toLowerCase() === originalNickname.toLowerCase()) {
      setMessage("Nickname is unchanged.");
      return;
    }

    setMessage("Checking nickname...");

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
      setMessage("This nickname is already taken.");
      return;
    }

    setMessage("Saving...");

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
        setMessage("This nickname is already taken.");
        return;
      }

      setMessage("Failed to save nickname.");
      return;
    }

    setOriginalNickname(cleanNickname);
    setNickname(cleanNickname);
    setProfile({
      ...profile,
      nickname: cleanNickname,
      can_change_nickname: false,
    });

    setMessage("Nickname saved.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Loading profile...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Not logged in.
      </main>
    );
  }

  if (!stats || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        No profile data found.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Player profile
          </p>

          <h1 className="text-4xl font-black tracking-tight">
            {originalNickname}
          </h1>

          <p className="mt-2 text-zinc-400">{email}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300">
              Role: {profile.role}
            </span>

            {profile.is_premium && (
              <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-300">
                Premium
              </span>
            )}

            {canEditNickname && (
              <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-sm text-blue-300">
                Nickname change available
              </span>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <label className="mb-2 block text-sm font-medium text-zinc-400">
            Nickname
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={!canEditNickname}
              placeholder="Enter nickname"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            />

            <button
              onClick={handleSaveNickname}
              disabled={!canEditNickname}
              className="rounded-xl bg-white px-5 py-3 font-bold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              Save
            </button>
          </div>

          {!canEditNickname && (
            <p className="mt-3 text-sm text-zinc-500">
              Nickname changes are locked. Admin, premium status, or a nickname-change permission is required.
            </p>
          )}

          {message && <p className="mt-3 text-sm text-zinc-400">{message}</p>}
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-4xl font-black text-emerald-300">
              {stats.total_correct}
            </p>
            <p className="mt-2 text-zinc-400">Correct answers</p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-4xl font-black text-red-300">
              {stats.total_wrong}
            </p>
            <p className="mt-2 text-zinc-400">Wrong answers</p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-4xl font-black text-yellow-300">
              {stats.best_streak}
            </p>
            <p className="mt-2 text-zinc-400">Best streak</p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-4xl font-black text-blue-300">
              {stats.games_played}
            </p>
            <p className="mt-2 text-zinc-400">Games played</p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-4xl font-black text-purple-300">
              {totalAnswers}
            </p>
            <p className="mt-2 text-zinc-400">Total answers</p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-4xl font-black text-cyan-300">
              {accuracy}%
            </p>
            <p className="mt-2 text-zinc-400">Accuracy</p>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-2xl font-bold">Highlights</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Favorite category</p>
              <p className="mt-2 text-2xl font-black">
                {favoriteCategory
                  ? getCategoryName(favoriteCategory.category_id)
                  : "Not enough data"}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Best category streak</p>
              <p className="mt-2 text-2xl font-black text-yellow-300">
                {categoryStats.length > 0
                  ? Math.max(...categoryStats.map((item) => item.best_streak))
                  : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-6 text-2xl font-bold">Category stats</h2>

          {categoryStats.length === 0 ? (
            <p className="text-zinc-400">
              No category stats yet. Play Infinite Mode to collect data.
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
                      <div>
                        <p className="text-zinc-500">Correct</p>
                        <p className="text-lg font-bold text-emerald-300">
                          {item.correct_answers}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Wrong</p>
                        <p className="text-lg font-bold text-red-300">
                          {item.wrong_answers}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Best streak</p>
                        <p className="text-lg font-bold text-yellow-300">
                          {item.best_streak}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Accuracy</p>
                        <p className="text-lg font-bold text-cyan-300">
                          {categoryAccuracy}%
                        </p>
                      </div>
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