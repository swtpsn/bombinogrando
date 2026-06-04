"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function TestV2Page() {
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function loadLevels() {
      const { data, error } = await supabase
        .from("levels_v2")
        .select("*")
        .order("id");

      if (error) {
        console.error(error);
        setErrorText(error.message);
        setLoading(false);
        return;
      }

      setLevels(data || []);
      setLoading(false);
    }

    loadLevels();
  }, []);

  if (loading) {
    return (
      <main className="p-8">
        <h1>Loading levels_v2...</h1>
      </main>
    );
  }

  if (errorText) {
    return (
      <main className="p-8">
        <h1>Error</h1>
        <p>{errorText}</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold">
        levels_v2 test
      </h1>

      <div className="space-y-6">
        {levels.map((level) => (
          <div
            key={level.id}
            className="rounded border p-4"
          >
            <p>
              <strong>ID:</strong> {level.id}
            </p>

            <p>
              <strong>Mode:</strong> {level.mode_id}
            </p>

            <p>
              <strong>Category:</strong> {level.category_id}
            </p>

            <p>
              <strong>Difficulty:</strong> {level.difficulty}
            </p>

            <p>
              <strong>Title:</strong> {level.title}
            </p>

            <pre className="mt-3 overflow-auto rounded bg-zinc-100 p-3 text-sm">
              {JSON.stringify(level.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </main>
  );
}