"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Level = {
  id: number;
  title: string;
  data: {
    question: string;
    options: string[];
    correct: string;
  };
};

type Profile = {
  role: string;
  is_premium: boolean;
};

function shuffleArray(items: string[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export default function PlayPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [statsSaved, setStatsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const gameFinished =
    levels.length > 0 && currentIndex >= levels.length;

  useEffect(() => {
    async function loadLevels() {
      const { category } = await params;

      const { data: categoryData, error: categoryError } =
        await supabase
          .from("categories")
          .select("*")
          .eq("slug", category)
          .single();

      if (categoryError || !categoryData) {
        console.error(categoryError);
        setLoading(false);
        return;
      }

      setCategoryName(categoryData.name);

      if (categoryData.is_premium) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("role, is_premium")
            .eq("id", user.id)
            .single();

        if (profileError || !profileData) {
          console.error(profileError);
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const profile = profileData as Profile;
        const hasAccess =
          profile.role === "admin" || profile.is_premium === true;

        if (!hasAccess) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }

      const { data: levelsData, error: levelsError } =
        await supabase
          .from("levels_v2")
          .select("*")
          .eq("category_id", categoryData.id)
          .order("id");

      if (levelsError) {
        console.error(levelsError);
        setLoading(false);
        return;
      }

      setLevels(levelsData || []);
      setLoading(false);
    }

    loadLevels();
  }, [params]);

  useEffect(() => {
    if (!levels[currentIndex]) {
      return;
    }

    setShuffledOptions(
      shuffleArray(levels[currentIndex].data.options)
    );
  }, [levels, currentIndex]);

  useEffect(() => {
    async function saveStats() {
      if (!gameFinished || statsSaved) {
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaveMessage("Stats not saved: not logged in.");
        setStatsSaved(true);
        return;
      }

      const { data: currentStats, error: readError } =
        await supabase
          .from("user_stats")
          .select("*")
          .eq("user_id", user.id)
          .single();

      if (readError || !currentStats) {
        console.error(readError);
        setSaveMessage("Stats save error.");
        setStatsSaved(true);
        return;
      }

      const { error: updateError } = await supabase
        .from("user_stats")
        .update({
          total_correct:
            currentStats.total_correct + correctAnswers,
          total_wrong:
            currentStats.total_wrong + wrongAnswers,
          games_played:
            currentStats.games_played + 1,
          best_streak:
            bestStreak > currentStats.best_streak
              ? bestStreak
              : currentStats.best_streak,
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error(updateError);
        setSaveMessage("Stats save error.");
        setStatsSaved(true);
        return;
      }

      setSaveMessage("Stats saved.");
      setStatsSaved(true);
    }

    saveStats();
  }, [
    gameFinished,
    statsSaved,
    correctAnswers,
    wrongAnswers,
    bestStreak,
  ]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Loading category...
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
        <section className="mx-auto max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-xl">
          <div className="mb-6 text-6xl">🔒</div>

          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            {categoryName}
          </p>

          <h1 className="mb-4 text-4xl font-black tracking-tight">
            Premium required
          </h1>

          <p className="mx-auto max-w-md text-zinc-400">
            This category is available only for premium players.
          </p>

          <Link
            href="/categories"
            className="mt-8 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Back to categories
          </Link>
        </section>
      </main>
    );
  }

  if (gameFinished) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
        <section className="mx-auto max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-xl">
          <div className="mb-6 text-6xl">🎉</div>

          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            {categoryName}
          </p>

          <h1 className="mb-6 text-4xl font-black tracking-tight">
            Category completed!
          </h1>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-3xl font-black text-emerald-300">
                {correctAnswers}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Correct
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-3xl font-black text-red-300">
                {wrongAnswers}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Wrong
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-3xl font-black text-yellow-300">
                {bestStreak}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Best streak
              </p>
            </div>
          </div>

          {saveMessage && (
            <p className="mt-6 text-sm text-zinc-400">
              {saveMessage}
            </p>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-white px-5 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200"
            >
              Play again
            </button>

            <Link
              href="/categories"
              className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Back to categories
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!levels[currentIndex]) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        No levels found.
      </main>
    );
  }

  const currentLevel = levels[currentIndex];

  function handleCheckAnswer() {
    if (isAnswered) {
      return;
    }

    if (!selectedOption) {
      return;
    }

    if (selectedOption === currentLevel.data.correct) {
      setCorrectAnswers((prev) => prev + 1);

      setStreak((prev) => {
        const newStreak = prev + 1;

        setBestStreak((best) =>
          newStreak > best ? newStreak : best
        );

        return newStreak;
      });

      setResultMessage("✅ Correct!");
      setIsAnswered(true);

      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOption("");
        setResultMessage("");
        setIsAnswered(false);
      }, 1000);

      return;
    }

    setWrongAnswers((prev) => prev + 1);
    setStreak(0);
    setResultMessage("❌ Wrong answer. Try again.");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            {categoryName}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-orange-300">
              🔥 Streak: {streak}
            </div>

            <div className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-yellow-300">
              🏆 Best: {bestStreak}
            </div>

            <div className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-300">
              Question {currentIndex + 1} / {levels.length}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl md:p-8">
          <h1 className="mb-8 text-3xl font-black tracking-tight md:text-4xl">
            {currentLevel.data.question}
          </h1>

          <div className="grid gap-3">
            {shuffledOptions.map((option) => {
              const isSelected = selectedOption === option;

              return (
                <button
                  key={option}
                  onClick={() => setSelectedOption(option)}
                  className={`rounded-2xl border p-4 text-left text-lg font-semibold transition ${
                    isSelected
                      ? "border-blue-400 bg-blue-500/20 text-blue-200"
                      : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleCheckAnswer}
            disabled={isAnswered || !selectedOption}
            className="mt-6 w-full rounded-2xl bg-white px-5 py-4 font-bold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            Check answer
          </button>

          {resultMessage && (
            <p className="mt-5 text-lg font-semibold">
              {resultMessage}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}