"use client";

import { useState } from "react";
import { levels } from "./data/levels";

export default function Home() {
  const [levelIndex, setLevelIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [resultMessage, setResultMessage] = useState<string>("");
  const [isLevelComplete, setIsLevelComplete] = useState<boolean>(false);

  const currentLevel = levels[levelIndex];
  const isDemoCompleted = levelIndex >= levels.length;

  const handleCheckAnswer = () => {
    if (!currentLevel) {
      return;
    }

    if (selectedOption === currentLevel.correctAnswer) {
      setResultMessage(currentLevel.successMessage);
      setIsLevelComplete(true);
      return;
    }

    setResultMessage("Incorrect. Try again.");
    setIsLevelComplete(false);
  };

  const handleNextLevel = () => {
    setLevelIndex((previousLevel) => previousLevel + 1);
    setSelectedOption("");
    setResultMessage("");
    setIsLevelComplete(false);
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 font-sans text-zinc-900">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-zinc-200">
        <h1 className="text-4xl font-bold tracking-tight">Bombinogrando</h1>
        <p className="mt-2 text-lg text-zinc-600">Find the odd one out</p>

        <div className="mt-8 w-full max-w-md">
          {isDemoCompleted ? (
            <p className="text-2xl font-semibold">
              Congratulations! Demo completed.
            </p>
          ) : (
            <>
              <p className="text-2xl font-semibold">{currentLevel.question}</p>

              <div className="mt-5 grid gap-3">
                {currentLevel.options.map((option) => {
                  const isSelected = selectedOption === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedOption(option)}
                      className={`rounded-xl border px-4 py-3 text-base font-medium transition ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleCheckAnswer}
                className="mt-6 w-full rounded-xl bg-zinc-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-zinc-700"
              >
                Check answer
              </button>

              {resultMessage ? (
                <p className="mt-5 text-base text-zinc-700">{resultMessage}</p>
              ) : null}

              {isLevelComplete ? (
                <button
                  type="button"
                  onClick={handleNextLevel}
                  className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-500"
                >
                  Next level
                </button>
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
