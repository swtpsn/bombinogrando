"use client";

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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const [isAnswered, setIsAnswered] = useState(false);

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

  if (loading) {
    return (
      <main className="p-8">
        Loading category...
      </main>
    );
  }

  const gameFinished =
    levels.length > 0 && currentIndex >= levels.length;

  if (gameFinished) {
    return (
      <main className="p-8">
        <h1 className="mb-4 text-3xl font-bold">
          {categoryName}
        </h1>

        <h2 className="mb-4 text-2xl font-semibold">
          Category completed!
        </h2>

        <p>
          Correct answers: {correctAnswers} / {levels.length}
        </p>

        <p className="mt-2">
          Best streak: {bestStreak}
        </p>
      </main>
    );
  }

  if (!levels[currentIndex]) {
    return (
      <main className="p-8">
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

    setStreak(0);

    setResultMessage("❌ Wrong answer. Try again.");
  }

  return (
    <main className="p-8">
      <h1 className="mb-2 text-3xl font-bold">
        {categoryName}
      </h1>

      <div className="mb-4 flex gap-6 text-lg font-medium">
        <span>🔥 Streak: {streak}</span>
        <span>🏆 Best: {bestStreak}</span>
      </div>

      <p className="mb-6">
        Question {currentIndex + 1} of {levels.length}
      </p>

      <div className="rounded border p-4">
        <h2 className="mb-6 text-xl font-semibold">
          {currentLevel.data.question}
        </h2>

        <div className="space-y-3">
          {shuffledOptions.map((option) => (
            <button
              key={option}
              onClick={() => setSelectedOption(option)}
              className={`block w-full rounded border p-3 text-left ${
                selectedOption === option
                  ? "border-blue-500"
                  : ""
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          onClick={handleCheckAnswer}
          disabled={isAnswered}
          className="mt-6 rounded border px-4 py-2"
        >
          Check answer
        </button>

        {resultMessage && (
          <p className="mt-4">
            {resultMessage}
          </p>
        )}
      </div>
    </main>
  );
}