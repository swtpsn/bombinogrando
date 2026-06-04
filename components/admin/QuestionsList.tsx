import { useMemo, useState } from "react";

type Category = {
  id: number;
  name: string;
  slug: string;
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

type Props = {
  questions: ExistingQuestion[];
  categories: Category[];
  isDeletingId: number | null;
  onEditQuestion: (question: ExistingQuestion) => void;
  onArchiveQuestion: (questionId: number) => void;
  onRestoreQuestion: (questionId: number) => void;
};

export default function QuestionsList({
  questions,
  categories,
  isDeletingId,
  onEditQuestion,
  onArchiveQuestion,
  onRestoreQuestion,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  function getCategoryName(categoryIdValue: number) {
    const category = categories.find((item) => item.id === categoryIdValue);
    return category?.name || "Unknown category";
  }

  const filteredQuestions = useMemo(() => {
    return questions.filter((item) => {
      const matchesCategory =
        selectedCategoryId === "all" ||
        item.category_id === Number(selectedCategoryId);

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && item.is_active) ||
        (selectedStatus === "archived" && !item.is_active);

      const text = [
        item.title,
        item.data?.question,
        item.data?.correct,
        item.explanation,
        ...(item.data?.options || []),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = text.includes(searchText.trim().toLowerCase());

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [questions, searchText, selectedCategoryId, selectedStatus]);

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Existing Questions</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Showing {filteredQuestions.length} of {questions.length} latest questions.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search questions..."
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
          />

          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
          >
            <option value="all">All categories</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="archived">Archived only</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuestions.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-4 ${
              item.is_active
                ? "border-zinc-800 bg-zinc-950"
                : "border-red-500/20 bg-red-500/5 opacity-70"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-zinc-500">
                    #{item.id} · {getCategoryName(item.category_id)}
                  </p>

                  {item.is_active ? (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-300">
                      Archived
                    </span>
                  )}
                </div>

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

              <div className="flex shrink-0 flex-col gap-2">
                <button
                  onClick={() => onEditQuestion(item)}
                  className="rounded-xl border border-blue-500/40 px-4 py-2 text-sm font-bold text-blue-300 hover:bg-blue-500/10"
                >
                  Edit
                </button>

                {item.is_active ? (
                  <button
                    onClick={() => onArchiveQuestion(item.id)}
                    disabled={isDeletingId === item.id}
                    className="rounded-xl border border-yellow-500/40 px-4 py-2 text-sm font-bold text-yellow-300 hover:bg-yellow-500/10 disabled:opacity-50"
                  >
                    {isDeletingId === item.id ? "Archiving..." : "Archive"}
                  </button>
                ) : (
                  <button
                    onClick={() => onRestoreQuestion(item.id)}
                    disabled={isDeletingId === item.id}
                    className="rounded-xl border border-emerald-500/40 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    {isDeletingId === item.id ? "Restoring..." : "Restore"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredQuestions.length === 0 && (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-400">
            No questions found.
          </p>
        )}
      </div>
    </div>
  );
}