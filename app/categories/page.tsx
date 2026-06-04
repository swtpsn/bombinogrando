"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Category = {
  id: number;
  slug: string;
  name: string;
  is_premium: boolean;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("id");

      if (error) {
        console.error(error);
        setErrorText(error.message);
        setLoading(false);
        return;
      }

      setCategories(data || []);
      setLoading(false);
    }

    loadCategories();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading categories...
      </main>
    );
  }

  if (errorText) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Error: {errorText}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-4xl font-bold">
          Bombinogrando
        </h1>

        <div className="space-y-3">
          {categories.map((category) => (
        <Link
            key={category.id}
            href={`/play/${category.slug}`}
            className="block rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md"
        >
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">
                {category.name}
              </span>
          
              {category.is_premium ? (
                <span>🔒 Premium</span>
              ) : (
                <span>Free</span>
              )}
            </div>
          </Link>
          ))}
        </div>
      </div>
    </main>
  );
}