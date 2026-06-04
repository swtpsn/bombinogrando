"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Category = {
  id: number;
  slug: string;
  name: string;
  is_premium: boolean;
};

type Profile = {
  role: string;
  is_premium: boolean;
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
        .select("role, is_premium")
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
        Loading categories...
      </main>
    );
  }

  if (errorText) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-red-400">
        Error: {errorText}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Choose your challenge
          </p>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Categories
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-400">
            Pick a topic, build your streak, and climb the leaderboard.
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
                      🔒 Premium
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      Free
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-bold">
                  {category.name}
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  {isLocked ? "Premium required" : "Start playing →"}
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
              <Link
                key={category.id}
                href={`/play/${category.slug}`}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm transition hover:-translate-y-1 hover:border-zinc-600 hover:bg-zinc-900/80"
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}