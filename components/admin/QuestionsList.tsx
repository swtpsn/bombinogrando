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
  onDeleteQuestion: (questionId: number) => void;
};

export default function QuestionsList({
  questions,
  categories,
  isDeletingId,
  onDeleteQuestion,
}: Props) {
  function getCategoryName(categoryIdValue: number) {
    const category = categories.find((item) => item.id === categoryIdValue);
    return category?.name || "Unknown category";
  }

  return (
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
                onClick={() => onDeleteQuestion(item.id)}
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
  );
}