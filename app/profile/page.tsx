"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type PlayerStats = {
  total_correct: number;
  total_wrong: number;
  best_streak: number;
  games_played: number;
};

export default function ProfilePage() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const { data, error } = await supabase
        .from("player_stats")
        .select("*")
        .limit(1)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setStats(data);
      setLoading(false);
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <main className="p-8">
        Loading profile...
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="p-8">
        No stats found.
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Player Profile
      </h1>

      <div className="space-y-4 text-xl">
        <p>✅ Correct answers: {stats.total_correct}</p>
        <p>❌ Wrong answers: {stats.total_wrong}</p>
        <p>🏆 Best streak: {stats.best_streak}</p>
        <p>🎮 Games played: {stats.games_played}</p>
      </div>
    </main>
  );
}