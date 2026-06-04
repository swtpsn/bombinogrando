import { useState } from "react";

type Category = {
  id: number;
  name: string;
  slug: string;
  is_premium: boolean;
};

type Props = {
  categories: Category[];
  onCreateCategory: (category: {
    name: string;
    slug: string;
    is_premium: boolean;
  }) => void;
  isCreatingCategory: boolean;
};

export default function CategoriesManager({
  categories,
  onCreateCategory,
  isCreatingCategory,
}: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isPremium, setIsPremium] = useState(false);

  function handleCreate() {
    onCreateCategory({
      name: name.trim(),
      slug: slug.trim(),
      is_premium: isPremium,
    });

    setName("");
    setSlug("");
    setIsPremium(false);
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-6 text-2xl font-bold">Categories</h2>

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <h3 className="mb-4 text-lg font-bold">Create category</h3>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isCreatingCategory}
          placeholder="Name"
          className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white"
        />

        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={isCreatingCategory}
          placeholder="Slug, for example movies"
          className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white"
        />

        <label className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isPremium}
            onChange={(e) => setIsPremium(e.target.checked)}
            disabled={isCreatingCategory}
          />
          Premium category
        </label>

        <button
          onClick={handleCreate}
          disabled={isCreatingCategory}
          className="rounded-xl bg-white px-5 py-3 font-bold text-zinc-950 disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isCreatingCategory ? "Creating..." : "Create category"}
        </button>
      </div>

      <div className="space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
          >
            <div>
              <h3 className="font-bold">{category.name}</h3>
              <p className="text-sm text-zinc-500">{category.slug}</p>
            </div>

            {category.is_premium ? (
              <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                Premium
              </span>
            ) : (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                Free
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}