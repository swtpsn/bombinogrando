"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.push("/categories");
        return;
      }

      setCheckingAuth(false);
    }

    checkUser();
  }, [router]);

  async function handleRegister() {
    const cleanNickname = nickname.trim();
    const cleanEmail = email.trim();

    const errors: string[] = [];

    if (!cleanNickname) {
      errors.push("Nickname is required.");
    }

    if (!cleanEmail) {
      errors.push("Email is required.");
    }

    if (!password) {
      errors.push("Password is required.");
    }

    if (errors.length > 0) {
      setMessages(errors);
      return;
    }

    setMessages(["Checking availability..."]);

    const { data: existingProfiles, error: nicknameCheckError } =
      await supabase
        .from("profiles")
        .select("id")
        .ilike("nickname", cleanNickname)
        .limit(1);

    if (nicknameCheckError) {
      setMessages([nicknameCheckError.message]);
      return;
    }

    if (existingProfiles && existingProfiles.length > 0) {
      errors.push("This nickname is already taken.");
    }

    setMessages(["Creating account..."]);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (error) {
      errors.push(error.message);
    }

    const createdUser = data.user;

    if (!createdUser || createdUser.identities?.length === 0) {
      errors.push("This email is already registered.");
    }

    if (errors.length > 0 || !createdUser) {
      setMessages(errors);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: createdUser.id,
      nickname: cleanNickname,
    });

    if (profileError) {
      if (profileError.code === "23505") {
        setMessages(["This nickname is already taken."]);
        return;
      }

      setMessages([profileError.message]);
      return;
    }

    const { error: statsError } = await supabase.from("user_stats").insert({
      user_id: createdUser.id,
    });

    if (statsError) {
      setMessages([statsError.message]);
      return;
    }

    setMessages(["Account created successfully. You can now log in."]);
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Checking session...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-2 text-3xl font-black">Register</h1>

        <p className="mb-6 text-zinc-400">
          Create an account to save your progress.
        </p>

        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-blue-400"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-blue-400"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-blue-400"
        />

        <button
          onClick={handleRegister}
          className="w-full rounded-xl bg-white px-4 py-3 font-bold text-zinc-950 transition hover:bg-zinc-200"
        >
          Create account
        </button>

        {messages.length > 0 && (
          <div className="mt-4 space-y-1 text-sm text-zinc-400">
            {messages.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}