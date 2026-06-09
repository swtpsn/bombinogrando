"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";


type Option = {
  id: string;
  text: string;
};

type Question = {
  id: number;
  question: string;
  options: Option[];
};

export default function DailyPage() {
  const router = useRouter();

  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [challengeDate, setChallengeDate] = useState("");
  const [timeUntilNextDaily, setTimeUntilNextDaily] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [prefetchedQuestion, setPrefetchedQuestion] =
    useState<Question | null>(null);

  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [score, setScore] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rewardEligible, setRewardEligible] = useState(false);

  const [message, setMessage] = useState("");
  const [explanation, setExplanation] = useState("");

  function getTimeUntilNextDaily() {
    const now = new Date();
  
    const helsinkiNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Helsinki" })
    );
  
    const nextDaily = new Date(helsinkiNow);
    nextDaily.setDate(nextDaily.getDate() + 1);
    nextDaily.setHours(0, 0, 0, 0);
  
    const diffMs = nextDaily.getTime() - helsinkiNow.getTime();
  
    if (diffMs <= 0) {
      return "00:00:00";
    }
  
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
  
    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].join(":");
  }

  useEffect(() => {
    async function startDaily() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/daily/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Не удалось открыть дейлик.");
        setLoading(false);
        return;
      }

      setChallengeDate(data.challengeDate || "");

      if (data.alreadyCompleted) {
        setCompleted(true);
        setScore(data.score || 0);
        setBestStreak(data.bestStreak || 0);
        setMessage("Вы уже прошли сегодняшний дейлик.");
        setLoading(false);
        return;
      }

      setAttemptId(data.attemptId);
      setQuestion(data.question);
      setCurrentPosition(data.currentPosition || 0);
      setTotalQuestions(data.totalQuestions || 10);
      setScore(data.score || 0);
      setBestStreak(data.bestStreak || 0);
      setCurrentStreak(data.currentStreak || 0);
      setLoading(false);
    }

    startDaily();
  }, [router]);

  useEffect(() => {
    if (!completed) return;
  
    const updateTimer = () => {
      const nextValue = getTimeUntilNextDaily();
  
      setTimeUntilNextDaily(nextValue);
  
      if (nextValue === "00:00:00") {
        window.location.reload();
      }
    };
  
    updateTimer();
  
    const timerId = window.setInterval(updateTimer, 1000);
  
    return () => {
      window.clearInterval(timerId);
    };
  }, [completed]);

  async function handleAnswer() {
    if (!attemptId || !question || !selectedOptionId || answering || completed) {
      return;
    }

    setAnswering(true);
    setMessage("");
    setExplanation("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch("/api/daily/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          attemptId,
          selectedOptionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Не удалось проверить ответ.");
        setAnswering(false);
        return;
      }

      setScore(data.score || 0);
      setBestStreak(data.bestStreak || 0);
      setCurrentStreak(data.currentStreak || 0);
      setExplanation(data.explanation || "");
      setMessage(data.isCorrect ? "Верно!" : "Неверно.");

      if (data.isCompleted) {
        setCompleted(true);
        setRewardEligible(data.rewardEligible || false);
        setAnswering(false);
        return;
      }

      
      setQuestion(data.nextQuestion);
      setPrefetchedQuestion(data.prefetchedQuestion || null);
      setCurrentPosition(data.currentPosition || currentPosition + 1);
      setSelectedOptionId("");
      setAnswering(false);

    } catch (error) {
      console.error(error);
      setMessage("Ошибка сети. Попробуйте ещё раз.");
      setAnswering(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Загрузка дейлика...
      </main>
    );
  }

  if (completed) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <div className="mb-5 text-6xl">🎁</div>

          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Дейлик дня · {challengeDate}
          </p>

          <h1 className="mb-4 text-4xl font-black">
            Дейлик пройден!
          </h1>

          <p className="text-2xl font-bold text-emerald-300">
            Результат: {score}/{totalQuestions}
          </p>

          <p className="mt-3 text-zinc-400">
            Лучший стрик: {bestStreak}
          </p>

          <p className="mt-3 text-zinc-400">
            {rewardEligible
              ? "Бонус доступен."
              : "Бонус пока недоступен, но дейлик засчитан."}
          </p>

          <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
            <p className="text-sm uppercase tracking-widest text-blue-300">
                Следующий дейлик
            </p>

            <p className="mt-2 text-3xl font-black text-white">
                {timeUntilNextDaily || "00:00:00"}
            </p>
          </div>

          {message && (
            <p className="mt-5 text-zinc-400">
              {message}
            </p>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/categories"
              className="rounded-xl bg-white px-5 py-3 font-bold text-zinc-950 hover:bg-zinc-200"
            >
              К категориям
            </Link>

            <Link
              href="/leaderboard"
              className="rounded-xl border border-zinc-700 px-5 py-3 font-bold text-zinc-200 hover:border-zinc-500"
            >
              К рейтингу
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Дейлик дня · {challengeDate}
          </p>

          <h1 className="text-4xl font-black tracking-tight">
            Ежедневный вызов
          </h1>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-blue-300">
              Вопрос: {currentPosition + 1}/{totalQuestions}
            </div>

            <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-emerald-300">
              Счёт: {score}
            </div>

            <div className="rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-orange-300">
              🔥 Стрик: {currentStreak}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl md:p-8">
          <h2 className="mb-8 text-3xl font-black tracking-tight md:text-4xl">
            {question?.question}
          </h2>

          <div className="grid gap-3">
            {question?.options.map((option) => {
              const isSelected = selectedOptionId === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedOptionId(option.id)}
                  disabled={answering}
                  className={`rounded-2xl border p-4 text-left text-lg font-semibold transition ${
                    isSelected
                      ? "border-blue-400 bg-blue-500/20 text-blue-200"
                      : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {option.text}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleAnswer}
            disabled={!selectedOptionId || answering}
            className="mt-6 w-full rounded-2xl bg-white px-5 py-4 font-bold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {answering ? "Проверяем..." : "Ответить"}
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
      </section>
    </main>
  );
}