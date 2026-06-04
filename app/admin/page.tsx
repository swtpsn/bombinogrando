"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type BulkQuestion = {
  category_slug: string;
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  difficulty?: number;
};

type ExistingQuestion = {
  id: number;
  category_id: number;
  title: string;
  explanation: string | null;
  is_active: boolean;
  data: {
    question: string;
    options: string[];
    correct: string;
  };
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<ExistingQuestion[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [question, setQuestion] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");

  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [option3, setOption3] = useState("");
  const [option4, setOption4] = useState("");

  const [bulkJson, setBulkJson] = useState("");
  const [message, setMessage] = useState("");

  const [isImporting, setIsImporting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  async function loadQuestions() {
    const { data, error } = await supabase
      .from("levels_v2")
      .select("id, category_id, title, explanation, is_active, data")
      .order("id", { ascending: false })
      .limit(30);

    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    setQuestions(data || []);
  }

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");

      setCategories(categoriesData || []);

      if (categoriesData?.length) {
        setCategoryId(String(categoriesData[0].id));
      }

      await loadQuestions();

      setLoading(false);
    }

    loadPage();
  }, []);

  function getCategoryName(categoryIdValue: number) {
    const category = categories.find((item) => item.id === categoryIdValue);
    return category?.name || "Unknown category";
  }

  async function handleCreateQuestion() {
    if (isCreating) return;

    if (
      !categoryId ||
      !question ||
      !correctAnswer ||
      !option1 ||
      !option2 ||
      !option3 ||
      !option4 ||
      !explanation
    ) {
      setMessage("Fill all fields.");
      return;
    }

    const options = [option1, option2, option3, option4];

    if (!options.includes(correctAnswer)) {
      setMessage("Correct answer must match one of the options exactly.");
      return;
    }

    setIsCreating(true);
    setMessage("Creating question...");

    const { error } = await supabase.from("levels_v2").insert({
      mode_id: 1,
      category_id: Number(categoryId),
      difficulty: 1,
      title: question,
      explanation,
      is_active: true,
      data: {
        question,
        options,
        correct: correctAnswer,
      },
    });

    if (error) {
      console.error(error);
      setMessage(error.message);
      setIsCreating(false);
      return;
    }

    setQuestion("");
    setCorrectAnswer("");
    setExplanation("");
    setOption1("");
    setOption2("");
    setOption3("");
    setOption4("");

    await loadQuestions();

    setMessage("Question created.");
    setIsCreating(false);
  }

  async function handleBulkImport() {
    if (isImporting) return;

    setIsImporting(true);
    setMessage("Parsing JSON...");

    let parsed: BulkQuestion[];

    try {
      parsed = JSON.parse(bulkJson);
    } catch {
      setMessage("Invalid JSON.");
      setIsImporting(false);
      return;
    }

    if (!Array.isArray(parsed)) {
      setMessage("JSON must be an array of questions.");
      setIsImporting(false);
      return;
    }

    if (parsed.length === 0) {
      setMessage("JSON array is empty.");
      setIsImporting(false);
      return;
    }

    setMessage(`Validating ${parsed.length} questions...`);

    const rows = [];

    for (let index = 0; index < parsed.length; index += 1) {
      const item = parsed[index];

      if (
        !item.category_slug ||
        !item.question ||
        !item.correct ||
        !item.explanation ||
        !Array.isArray(item.options)
      ) {
        setMessage(`Question #${index + 1}: missing required fields.`);
        setIsImporting(false);
        return;
      }

      if (item.options.length !== 4) {
        setMessage(`Question #${index + 1}: options must contain exactly 4 items.`);
        setIsImporting(false);
        return;
      }

      if (!item.options.includes(item.correct)) {
        setMessage(`Question #${index + 1}: correct answer must be one of the options.`);
        setIsImporting(false);
        return;
      }

      const category = categories.find(
        (categoryItem) => categoryItem.slug === item.category_slug
      );

      if (!category) {
        setMessage(`Question #${index + 1}: unknown category_slug "${item.category_slug}".`);
        setIsImporting(false);
        return;
      }

      rows.push({
        mode_id: 1,
        category_id: category.id,
        difficulty: item.difficulty || 1,
        title: item.question,
        explanation: item.explanation,
        is_active: true,
        data: {
          question: item.question,
          options: item.options,
          correct: item.correct,
        },
      });
    }

    setMessage(`Importing ${rows.length} questions...`);

    const { error } = await supabase.from("levels_v2").insert(rows);

    if (error) {
      console.error(error);
      setMessage(error.message);
      setIsImporting(false);
      return;
    }

    setBulkJson("");
    await loadQuestions();

    setMessage(`Imported ${rows.length} questions.`);
    setIsImporting(false);
  }

  async function handleDeleteQuestion(questionId: number) {
    const confirmed = window.confirm("Delete this question?");
    if (!confirmed) return;

    setIsDeletingId(questionId);
    setMessage("Deleting question...");

    const { error } = await supabase
      .from("levels_v2")
      .delete()
      .eq("id", questionId);

    if (error) {
      console.error(error);
      setMessage(error.message);
      setIsDeletingId(null);
      return;
    }

    await loadQuestions();

    setMessage("Question deleted.");
    setIsDeletingId(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Loading admin panel...
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Access denied.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-black">Admin Panel</h1>

        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-6 text-2xl font-bold">Bulk Import JSON</h2>

          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            disabled={isImporting}
            rows={14}
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 font-mono text-sm disabled:opacity-60"
          />

          <button
            onClick={handleBulkImport}
            disabled={isImporting || !bulkJson.trim()}
            className="rounded-xl bg-white px-5 py-3 font-bold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isImporting ? "Importing..." : "Import questions"}
          </button>

          {isImporting && (
            <div className="mt-4 rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-blue-300">
              Import is running. Do not close this page.
            </div>
          )}
        </div>

        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-6 text-2xl font-bold">Create Single Question</h2>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={isCreating}
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 disabled:opacity-60"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isCreating}
            placeholder="Question"
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 disabled:opacity-60"
          />

          <input
            value={option1}
            onChange={(e) => setOption1(e.target.value)}
            disabled={isCreating}
            placeholder="Option 1"
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 disabled:opacity-60"
          />

          <input
            value={option2}
            onChange={(e) => setOption2(e.target.value)}
            disabled={isCreating}
            placeholder="Option 2"
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 disabled:opacity-60"
          />

          <input
            value={option3}
            onChange={(e) => setOption3(e.target.value)}
            disabled={isCreating}
            placeholder="Option 3"
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 disabled:opacity-60"
          />

          <input
            value={option4}
            onChange={(e) => setOption4(e.target.value)}
            disabled={isCreating}
            placeholder="Option 4"
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 disabled:opacity-60"
          />

          <input
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            disabled={isCreating}
            placeholder="Correct answer"
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 disabled:opacity-60"
          />

          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            disabled={isCreating}
            placeholder="Explanation"
            rows={4}
            className="mb-6 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 disabled:opacity-60"
          />

          <button
            onClick={handleCreateQuestion}
            disabled={isCreating}
            className="rounded-xl bg-white px-5 py-3 font-bold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isCreating ? "Creating..." : "Create question"}
          </button>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-6 text-2xl font-bold">Existing Questions</h2>

          <div className="space-y-4">
            {questions.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-zinc-500">
                      #{item.id} · {getCategoryName(item.category_id)}
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      {item.data?.question || item.title}
                    </h3>

                    <p className="mt-2 text-sm text-zinc-400">
                      Correct: {item.data?.correct}
                    </p>

                    {item.explanation && (
                      <p className="mt-2 text-sm text-zinc-500">
                        {item.explanation}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteQuestion(item.id)}
                    disabled={isDeletingId === item.id}
                    className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {isDeletingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <p className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}