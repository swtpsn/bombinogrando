"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getDictionary } from "../../lib/i18n/getDictionary";

type Category = {
  id: number;
  slug: string;
  name: string;
  is_premium: boolean;
};

type Profile = {
  role: string;
  is_premium: boolean;
  preferred_locale: string;
};

const categoryEmoji: Record<string, string> = {
  animals: "🐶",
  food: "🍔",
  science: "🧪",
  history: "📜",
  geography: "🌍",
  memes: "😂",
  crypto: "₿",
};

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const t = getDictionary(profile?.preferred_locale || "ru");

  const hasPremiumAccess =
    profile?.role === "admin" || profile?.is_premium === true;

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, is_premium, preferred_locale")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("id");

      if (categoriesError) {
        console.error(categoriesError);
        setErrorText(categoriesError.message);
        setLoading(false);
        return;
      }

      setCategories(categoriesData || []);
      setLoading(false);
    }

    loadData();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        {t.common.loading}
      </main>
    );
  }

  if (errorText) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-red-400">
        Ошибка: {errorText}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            {t.categories.chooseChallenge}
          </p>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            {t.categories.title}
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-400">
            {t.categories.subtitle}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const isLocked = category.is_premium && !hasPremiumAccess;

            const cardContent = (
              <>
                <div className="mb-6 flex items-start justify-between">
                  <div className="text-4xl">
                    {categoryEmoji[category.slug] || "🎯"}
                  </div>

                  {category.is_premium ? (
                    <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                      🔒 {t.categories.premium}
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      {t.categories.free}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-bold">
                  {category.name}
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  {isLocked
                    ? t.categories.premiumRequired
                    : t.categories.startPlaying}
                </p>
              </>
            );

            if (isLocked) {
              return (
                <div
                  key={category.id}
                  className="cursor-not-allowed rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 opacity-60 shadow-sm"
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <div
                key={category.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm transition hover:border-zinc-600 hover:bg-zinc-900/80"
              >
                {cardContent}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link
                    href={`/play/${category.slug}`}
                    className="rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-200 hover:border-zinc-500"
                  >
                    {t.categories.classic}
                  </Link>

                  <Link
                    href={`/infinite/${category.slug}`}
                    className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-zinc-950 hover:bg-zinc-200"
                  >
                    {t.categories.infinite}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}