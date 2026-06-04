"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  async function loadUserAndRole() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setIsLoggedIn(Boolean(user));

    if (!user) {
      setIsAdmin(false);
      setLoadingAuth(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setIsAdmin(profile?.role === "admin");
    setLoadingAuth(false);
  }

  useEffect(() => {
    loadUserAndRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserAndRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsAdmin(false);
    router.push("/login");
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          💣 Bombinogrando
        </Link>

        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/categories" className="text-zinc-300 hover:text-white">
            Categories
          </Link>

          <Link href="/leaderboard" className="text-zinc-300 hover:text-white">
            Leaderboard
          </Link>

          {!loadingAuth && isLoggedIn ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="text-yellow-300 hover:text-yellow-200">
                  Admin
                </Link>
              )}

              <Link href="/profile" className="text-zinc-300 hover:text-white">
                Profile
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-zinc-500 hover:text-white"
              >
                Logout
              </button>
            </>
          ) : null}

          {!loadingAuth && !isLoggedIn ? (
            <>
              <Link href="/login" className="text-zinc-300 hover:text-white">
                Login
              </Link>

              <Link
                href="/register"
                className="rounded-lg bg-white px-3 py-1.5 font-semibold text-zinc-950 hover:bg-zinc-200"
              >
                Register
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}