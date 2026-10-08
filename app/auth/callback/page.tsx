"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      let error = null;

      if (code) {
        ({ error } = await supabase.auth.exchangeCodeForSession(code));
      } else if (tokenHash && type === "email") {
        ({ error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        }));
      } else if (hash.get("access_token") && hash.get("refresh_token")) {
        ({ error } = await supabase.auth.setSession({
          access_token: hash.get("access_token")!,
          refresh_token: hash.get("refresh_token")!,
        }));
      } else {
        error = new Error("Missing sign-in credentials.");
      }

      if (cancelled) return;

      if (error) {
        setMessage("This sign-in link could not be verified. Please request a new one.");
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setMessage("Sign-in did not create a session. Please request a new link.");
        return;
      }

      window.history.replaceState({}, document.title, "/auth/callback");
      router.replace("/");
      router.refresh();
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "70px auto", textAlign: "center" }}>
        <div className="eyebrow">Gita Daily</div>
        <h1>{message}</h1>
        <p className="muted">Please wait…</p>
      </div>
    </main>
  );
}
