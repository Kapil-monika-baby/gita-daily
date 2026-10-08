"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code === "auth_callback_failed") setError("This sign-in link could not be verified. Please request a new link.");
    if (code === "invalid_auth_link") setError("This sign-in link is invalid. Please request a new link.");
    if (code === "missing_code") setError("The sign-in link was incomplete. Please request a new link.");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "70px auto" }}>
        <div className="eyebrow">Gita Daily</div>
        <h1>Continue your practice.</h1>
        <p className="muted">Sign in with a magic link. Your settings, bookmarks and Plus entitlement stay with your account.</p>
        {sent ? (
          <div className="meaning">Check your email for the secure sign-in link.</div>
        ) : (
          <form onSubmit={submit}>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", padding: 14, border: "1px solid var(--line)", borderRadius: 12, margin: "16px 0" }} />
            <button className="primary">Send sign-in link</button>
            {error && <p style={{ color: "#a33" }}>{error}</p>}
          </form>
        )}
        <div className="footer">No password is required.</div>
      </div>
    </main>
  );
}
