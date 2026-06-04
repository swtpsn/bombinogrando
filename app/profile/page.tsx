"use client";

import { useEffect, useState } from "react";
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

export default function ProfilePage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

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
      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleSaveNickname() {
    if (!userId || !profile) {
      return;
    }

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
      <section className="mx-auto max-w-3xl">
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

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </section>
    </main>
  );
}