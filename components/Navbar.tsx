"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getDictionary } from "../lib/i18n/getDictionary";

type Profile = {
  role: string;
  preferred_locale: string;
};

export default function Navbar() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [locale, setLocale] = useState("ru");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const t = getDictionary(locale);

  async function loadUserAndRole() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setIsLoggedIn(Boolean(user));

    if (!user) {
      setIsAdmin(false);
      setLocale("ru");
      setLoadingAuth(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, preferred_locale")
      .eq("id", user.id)
      .single();

    const typedProfile = profile as Profile | null;

    setIsAdmin(typedProfile?.role === "admin");
    setLocale(typedProfile?.preferred_locale || "ru");
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

  async function handleChangeLocale(nextLocale: "ru" | "en") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLocale(nextLocale);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        preferred_locale: nextLocale,
      })
      .eq("id", user.id);

    if (error) {
      console.error(error);
      return;
    }

    setLocale(nextLocale);
    setMenuOpen(false);
    window.location.reload();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsAdmin(false);
    setMenuOpen(false);
    router.push("/login");
  }

  const languageSwitcher = (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-700 p-1">
      <button
        type="button"
        onClick={() => handleChangeLocale("ru")}
        className={`rounded-md px-2 py-1 text-xs font-bold transition ${
          locale === "ru"
            ? "bg-white text-zinc-950"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        RU
      </button>

      <button
        type="button"
        onClick={() => handleChangeLocale("en")}
        className={`rounded-md px-2 py-1 text-xs font-bold transition ${
          locale === "en"
            ? "bg-white text-zinc-950"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  );

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

                {languageSwitcher}

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
                  {t.nav.categories}
                </Link>

                <Link
                  href="/leaderboard"
                  onClick={closeMenu}
                  className="rounded-xl px-3 py-3 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                >
                  {t.nav.leaderboard}
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    className="rounded-xl px-3 py-3 text-yellow-300 hover:bg-zinc-900 hover:text-yellow-200"
                  >
                    {t.nav.admin}
                  </Link>
                )}

                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="rounded-xl px-3 py-3 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                >
                  {t.nav.profile}
                </Link>

                <div className="px-3 py-2">
                  {languageSwitcher}
                </div>

                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-zinc-700 px-3 py-3 text-left text-zinc-300 hover:border-zinc-500 hover:text-white"
                >
                  {t.nav.logout}
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
                  {t.nav.login}
                </Link>

                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="rounded-xl bg-white px-3 py-3 text-center font-semibold text-zinc-950 hover:bg-zinc-200"
                >
                  {t.nav.register}
                </Link>
              </>
            ) : null}
          </div>
        )}
      </div>
    </nav>
  );
}