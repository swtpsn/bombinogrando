"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";


export default function LoginPage() {
  const router = useRouter();
  

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

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

  async function handleLogin() {
    setMessage("Входим...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/categories");
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Проверяем сессию...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-2 text-3xl font-black">Вход</h1>

        <p className="mb-6 text-zinc-400">
          Войдите в аккаунт и продолжайте набирать стрик.
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-blue-400"
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-blue-400"
        />

        <button
          onClick={handleLogin}
          className="w-full rounded-xl bg-white px-4 py-3 font-bold text-zinc-950 transition hover:bg-zinc-200"
        >
          Войти
        </button>

        {message && (
          <p className="mt-4 text-sm text-zinc-400">{message}</p>
        )}
      </section>
    </main>
  );
}