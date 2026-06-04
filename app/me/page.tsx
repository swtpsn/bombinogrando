"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MePage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || "");
      }
    }

    loadUser();
  }, []);

  return (
    <main className="p-8">
      <h1 className="mb-4 text-3xl font-bold">
        Current User
      </h1>

      <p>{email || "Not logged in"}</p>
    </main>
  );
}