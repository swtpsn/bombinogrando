"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type UserStats = {
  user_id: string;
  total_correct: number;
  total_wrong: number;
  best_streak: number;
  games_played: number;
};

type Profile = {
  id: string;
  nickname: string | null;
};

function getMedal(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `#${index + 1}`;
}

export default function LeaderboardPage() {
  const [stats, setStats] = useState<UserStats[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      const { data: statsData, error: statsError } = await supabase
        .from("user_stats")
        .select("*")
        .order("best_streak", { ascending: false });

      if (statsError) {
        console.error(statsError);
        setLoading(false);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      if (profilesError) {
        console.error(profilesError);
        setLoading(false);
        return;
      }

      setStats(statsData || []);
      setProfiles(profilesData || []);
      setLoading(false);
    }

    loadLeaderboard();
  }, []);

  function getNickname(userId: string) {
    const profile = profiles.find((item) => item.id === userId);
    return profile?.nickname || "Unknown player";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Loading leaderboard...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="mb-10">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Global ranking
          </p>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Leaderboard
          </h1>

          <p className="mt-3 text-zinc-400">
            Climb the ranking with your best streak.
          </p>
        </div>

        <div className="space-y-4">
          {stats.map((item, index) => (
            <div
              key={item.user_id}
              className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-black">
                    {getMedal(index)} {getNickname(item.user_id)}
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    Games played: {item.games_played}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-black text-yellow-300">
                    {item.best_streak}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Best streak
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-2xl font-bold text-emerald-300">
                    {item.total_correct}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Correct answers
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-2xl font-bold text-red-300">
                    {item.total_wrong}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Wrong answers
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}