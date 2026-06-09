"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getDictionary } from "../lib/i18n/getDictionary";

export default function Navbar() {
  const router = useRouter();
  const t = getDictionary("ru");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsAdmin(false);
    setMenuOpen(false);
    router.push("/login");
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            onClick={closeMenu}
            className="min-w-0 truncate text-lg font-bold tracking-tight sm:text-xl"
          >
            💣 Bombinogrando
          </Link>

          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            ☰
          </button>

          <div className="hidden items-center gap-4 text-sm font-medium md:flex">
            {!loadingAuth && isLoggedIn ? (
              <>
                <Link href="/categories" className="text-zinc-300 hover:text-white">
                  {t.nav.categories}
                </Link>

                <Link href="/leaderboard" className="text-zinc-300 hover:text-white">
                  {t.nav.leaderboard}
                </Link>

                {isAdmin && (
                  <Link href="/admin" className="text-yellow-300 hover:text-yellow-200">
                    {t.nav.admin}
                  </Link>
                )}

                <Link href="/profile" className="text-zinc-300 hover:text-white">
                  {t.nav.profile}
                </Link>

                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-zinc-500 hover:text-white"
                >
                  {t.nav.logout}
                </button>
              </>
            ) : null}

            {!loadingAuth && !isLoggedIn ? (
              <>
                <Link href="/login" className="text-zinc-300 hover:text-white">
                  {t.nav.login}
                </Link>

                <Link
                  href="/register"
                  className="rounded-lg bg-white px-3 py-1.5 font-semibold text-zinc-950 hover:bg-zinc-200"
                >
                  {t.nav.register}
                </Link>
              </>
            ) : null}
          </div>
        </div>

        {menuOpen && (
          <div className="mt-4 grid gap-2 border-t border-zinc-800 pt-4 text-sm font-medium md:hidden">
            {!loadingAuth && isLoggedIn ? (
              <>
                <Link
                  href="/categories"
                  onClick={closeMenu}
                  className="rounded-xl px-3 py-3 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                >
                  Categories
                </Link>

                <Link
                  href="/leaderboard"
                  onClick={closeMenu}
                  className="rounded-xl px-3 py-3 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                >
                  Leaderboard
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    className="rounded-xl px-3 py-3 text-yellow-300 hover:bg-zinc-900 hover:text-yellow-200"
                  >
                    Admin
                  </Link>
                )}

                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="rounded-xl px-3 py-3 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                >
                  Profile
                </Link>

                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-zinc-700 px-3 py-3 text-left text-zinc-300 hover:border-zinc-500 hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : null}

            {!loadingAuth && !isLoggedIn ? (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="rounded-xl px-3 py-3 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="rounded-xl bg-white px-3 py-3 text-center font-semibold text-zinc-950 hover:bg-zinc-200"
                >
                  Register
                </Link>
              </>
            ) : null}
          </div>
        )}
      </div>
    </nav>
  );
}