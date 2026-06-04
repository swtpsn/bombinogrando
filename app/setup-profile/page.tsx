"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SetupProfilePage() {
  const [message, setMessage] = useState("Setting up profile...");

  useEffect(() => {
    async function setupProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setMessage(`User error: ${userError.message}`);
        return;
      }

      if (!user) {
        setMessage("Not logged in.");
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          nickname: user.email,
        });

      if (profileError) {
        setMessage(`Profile error: ${profileError.message}`);
        return;
      }

      const { error: statsError } = await supabase
        .from("user_stats")
        .upsert({
          user_id: user.id,
        });

      if (statsError) {
        setMessage(`Stats error: ${statsError.message}`);
        return;
      }

      setMessage("Profile and stats are ready.");
    }

    setupProfile();
  }, []);

  return (
    <main className="p-8">
      <h1 className="mb-4 text-3xl font-bold">
        Setup Profile
      </h1>

      <p>{message}</p>
    </main>
  );
}