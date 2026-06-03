"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Level = {
  id: number;
  question: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_answer: string;
};

export default function TestPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLevels() {
      const { data, error } = await supabase
        .from("levels")
        .select("*");

      console.log("DATA:", data);
      console.log("ERROR:", error);

      if (data) {
        setLevels(data);
      }

      setLoading(false);
    }

    loadLevels();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-3xl font-bold">
        Supabase Test
      </h1>

      {levels.map((level) => (
        <div
          key={level.id}
          className="mb-4 rounded border p-4"
        >
          <p>
            <strong>ID:</strong> {level.id}
          </p>

          <p>
            <strong>Question:</strong> {level.question}
          </p>

          <p>
            <strong>Answer:</strong> {level.correct_answer}
          </p>
        </div>
      ))}
    </main>
  );
}