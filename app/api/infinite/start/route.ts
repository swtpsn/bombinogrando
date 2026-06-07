import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  pickAvailableQuestion,
  shuffleArray,
} from "../../../../lib/infiniteGame";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const categorySlug = body.categorySlug;

  if (!categorySlug) {
    return NextResponse.json(
      { error: "categorySlug is required" },
      { status: 400 }
    );
  }

  const { data: category, error: categoryError } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug, is_premium")
    .eq("slug", categorySlug)
    .single();

  if (categoryError || !category) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 }
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, is_premium, allow_question_repeats")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 403 }
    );
  }

  const hasPremiumAccess =
    profile.role === "admin" || profile.is_premium === true;

  if (category.is_premium && !hasPremiumAccess) {
    return NextResponse.json(
      { error: "Premium required" },
      { status: 403 }
    );
  }

  const allowQuestionRepeats =
    profile.allow_question_repeats === true;

  try {
    const selectedLevel = await pickAvailableQuestion({
      userId: user.id,
      categoryId: category.id,
      allowQuestionRepeats,
    });

    if (!selectedLevel) {
      return NextResponse.json(
        { error: "No unseen questions left in this category." },
        { status: 404 }
      );
    }

    const { data: run, error: runError } = await supabaseAdmin
      .from("game_runs")
      .insert({
        user_id: user.id,
        category_id: category.id,
        current_question_id: selectedLevel.id,
        streak: 0,
        is_finished: false,
      })
      .select("id")
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: runError?.message || "Failed to create game run." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      runId: run.id,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      question: {
        id: selectedLevel.id,
        question: selectedLevel.data.question,
        options: shuffleArray(selectedLevel.data.options),
      },
      streak: 0,
      repeatsAllowed: allowQuestionRepeats,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start game.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}