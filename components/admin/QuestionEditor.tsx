import { useEffect, useState } from "react";

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
  question: ExistingQuestion;
  onCancel: () => void;
  onSave: (updatedQuestion: {
    id: number;
    question: string;
    options: string[];
    correct: string;
    explanation: string;
  }) => void;
  isSaving: boolean;
};

export default function QuestionEditor({
  question,
  onCancel,
  onSave,
  isSaving,
}: Props) {
  const [questionText, setQuestionText] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");

  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [option3, setOption3] = useState("");
  const [option4, setOption4] = useState("");

  useEffect(() => {
    setQuestionText(question.data.question || question.title);
    setCorrectAnswer(question.data.correct || "");
    setExplanation(question.explanation || "");

    setOption1(question.data.options?.[0] || "");
    setOption2(question.data.options?.[1] || "");
    setOption3(question.data.options?.[2] || "");
    setOption4(question.data.options?.[3] || "");
  }, [question]);

  function handleSave() {
    const options = [option1, option2, option3, option4];

    onSave({
      id: question.id,
      question: questionText,
      options,
      correct: correctAnswer,
      explanation,
    });
  }

  return (
    <div className="mb-8 rounded-3xl border border-blue-500/40 bg-blue-500/10 p-6">
      <h2 className="mb-6 text-2xl font-bold text-blue-200">
        Edit Question #{question.id}
      </h2>

      <input
        value={questionText}
        onChange={(e) => setQuestionText(e.target.value)}
        disabled={isSaving}
        placeholder="Question"
        className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white disabled:opacity-60"
      />

      <input
        value={option1}
        onChange={(e) => setOption1(e.target.value)}
        disabled={isSaving}
        placeholder="Option 1"
        className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white disabled:opacity-60"
      />

      <input
        value={option2}
        onChange={(e) => setOption2(e.target.value)}
        disabled={isSaving}
        placeholder="Option 2"
        className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white disabled:opacity-60"
      />

      <input
        value={option3}
        onChange={(e) => setOption3(e.target.value)}
        disabled={isSaving}
        placeholder="Option 3"
        className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white disabled:opacity-60"
      />

      <input
        value={option4}
        onChange={(e) => setOption4(e.target.value)}
        disabled={isSaving}
        placeholder="Option 4"
        className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white disabled:opacity-60"
      />

      <input
        value={correctAnswer}
        onChange={(e) => setCorrectAnswer(e.target.value)}
        disabled={isSaving}
        placeholder="Correct answer"
        className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white disabled:opacity-60"
      />

      <textarea
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        disabled={isSaving}
        placeholder="Explanation"
        rows={4}
        className="mb-6 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white disabled:opacity-60"
      />

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-xl bg-white px-5 py-3 font-bold text-zinc-950 disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-xl border border-zinc-700 px-5 py-3 font-bold text-zinc-200 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}