"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Question = {
  id: number;
  question: string;
  options: string[];
};

type FinishType = "lost" | "completed" | null;

export default function InfinitePage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const router = useRouter();

  const [categoryName, setCategoryName] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [runId, setRunId] = useState<number | null>(null);

  const [selectedOption, setSelectedOption] = useState("");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const [loading, setLoading] = useState(true);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finishType, setFinishType] = useState<FinishType>(null);

  const [message, setMessage] = useState("");
  const [explanation, setExplanation] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");

  useEffect(() => {
    async function startGame() {
      const { category } = await params;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/infinite/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          categorySlug: category,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to start game.");
        setLoading(false);
        return;
      }

      setCategoryName(data.category.name);
      setQuestion(data.question);
      setRunId(data.runId);
      setStreak(data.streak || 0);
      setLoading(false);
    }

    startGame();
  }, [params, router]);

  async function sendAnswerRequest(accessToken: string) {
  if (!runId) {
    throw new Error("No active run.");
  }

  return fetch("/api/infinite/answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      runId,
      selectedOption,
    }),
  });
}

  async function handleAnswer() {
    if (!question || !selectedOption || checkingAnswer || gameOver) {
      return;
    }

    setCheckingAnswer(true);
    setMessage("");
    setExplanation("");
    setCorrectAnswer("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    try {
      let response = await sendAnswerRequest(session.access_token);

      if (response.status === 401) {
        const {
          data: { session: refreshedSession },
        } = await supabase.auth.refreshSession();

        if (!refreshedSession) {
          router.push("/login");
          return;
        }

        response = await sendAnswerRequest(
          refreshedSession.access_token
        );
      }

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to check answer.");
        setCheckingAnswer(false);
        return;
      }

      if (!data.isCorrect) {
        setGameOver(true);
        setFinishType("lost");
        setCorrectAnswer(data.correctAnswer || "");
        setExplanation(data.explanation || "");
        setMessage("Game over.");
        setCheckingAnswer(false);
        return;
      }

      const newStreak = data.streak || streak + 1;

      setStreak(newStreak);

      setBestStreak((currentBest) =>
        newStreak > currentBest ? newStreak : currentBest
      );

      if (data.gameOver) {
        setGameOver(true);
        setFinishType("completed");
        setExplanation(data.explanation || "");
        setMessage(data.message || "No more questions.");
        setCheckingAnswer(false);
        return;
      }

      setQuestion(data.nextQuestion);
      setSelectedOption("");
      setExplanation(data.explanation || "");
      setMessage("Correct!");
      setCheckingAnswer(false);
    } catch (error) {
      console.error(error);
      setMessage("Network error. Try again.");
      setCheckingAnswer(false);
    }
  }

  function handleRestart() {
    window.location.reload();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Loading infinite mode...
      </main>
    );
  }

  if (!question && !gameOver) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
        <section className="max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h1 className="mb-4 text-3xl font-black">Infinite Mode</h1>

          <p className="text-zinc-400">
            {message || "No question found."}
          </p>

          <Link
            href="/categories"
            className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-bold text-zinc-950"
          >
            Back to categories
          </Link>
        </section>
      </main>
    );
  }

  const completedCategory = finishType === "completed";

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Infinite Mode · {categoryName}
          </p>

          <h1 className="text-4xl font-black tracking-tight">
            Keep the streak alive
          </h1>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-orange-300">
              🔥 Streak: {streak}
            </div>

            <div className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-yellow-300">
              🏆 Best this run: {bestStreak}
            </div>
          </div>
        </div>

        {gameOver ? (
          <div
            className={`rounded-3xl border p-8 text-center ${
              completedCategory
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}
          >
            <div className="mb-5 text-6xl">
              {completedCategory ? "🎉" : "💥"}
            </div>

            <h2 className="mb-3 text-4xl font-black">
              {completedCategory ? "Category completed!" : "Game Over"}
            </h2>

            <p className="text-xl text-zinc-300">
              Final streak: {streak}
            </p>

            {correctAnswer && (
              <p className="mt-4 text-zinc-300">
                Correct answer:{" "}
                <span className="font-bold text-white">
                  {correctAnswer}
                </span>
              </p>
            )}

            {message && (
              <p className="mt-4 text-zinc-300">
                {message}
              </p>
            )}

            {explanation && (
              <p className="mt-4 text-zinc-400">
                {explanation}
              </p>
            )}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={handleRestart}
                className="rounded-xl bg-white px-5 py-3 font-bold text-zinc-950 hover:bg-zinc-200"
              >
                Play again
              </button>

              <Link
                href="/categories"
                className="rounded-xl border border-zinc-700 px-5 py-3 font-bold text-zinc-200 hover:border-zinc-500"
              >
                Back to categories
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl md:p-8">
            <h2 className="mb-8 text-3xl font-black tracking-tight md:text-4xl">
              {question?.question}
            </h2>

            <div className="grid gap-3">
              {question?.options.map((option) => {
                const isSelected = selectedOption === option;

                return (
                  <button
                    key={option}
                    onClick={() => setSelectedOption(option)}
                    disabled={checkingAnswer}
                    className={`rounded-2xl border p-4 text-left text-lg font-semibold transition ${
                      isSelected
                        ? "border-blue-400 bg-blue-500/20 text-blue-200"
                        : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleAnswer}
              disabled={!selectedOption || checkingAnswer}
              className="mt-6 w-full rounded-2xl bg-white px-5 py-4 font-bold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {checkingAnswer ? "Checking..." : "Check answer"}
            </button>

            {message && (
              <p className="mt-5 text-lg font-semibold text-emerald-300">
                {message}
              </p>
            )}

            {explanation && (
              <p className="mt-3 text-sm text-zinc-500">
                {explanation}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}