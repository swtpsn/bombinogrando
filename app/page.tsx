"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function redirectUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.push("/categories");
        return;
      }

      router.push("/login");
    }

    redirectUser();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      Loading Bombinogrando...
    </main>
  );
}