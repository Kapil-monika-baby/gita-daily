"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gita-daily-nine.vercel.app";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error_code");
    if (code === "otp_expired") {
      setError("That email link was already used or scanned. We have switched Gita Daily to a safer email-code sign-in.");
    } else if (params.get("error") === "auth_callback_failed") {
      setError("The previous sign-in link could not be verified. Please use the new email code sign-in.");
    }
  }, []);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
      setMessage("A 6-digit sign-in code has been sent. Enter it below.");
    }
    setBusy(false);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    window.location.replace("/");
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "70px auto" }}>
        <div className="eyebrow">Gita Daily</div>
        <h1>Continue your practice.</h1>
        <p className="muted">
          Sign in with a one-time email code. No passwords, redirects, or magic-link
          callbacks are required.
        </p>

        {!sent ? (
          <form onSubmit={sendCode}>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                width: "100%",
                padding: 14,
                border: "1px solid var(--line)",
                borderRadius: 12,
                margin: "16px 0",
              }}
            />
            <button className="primary" disabled={busy}>
              {busy ? "Sending…" : "Send sign-in code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <div className="meaning" style={{ marginTop: 18 }}>
              <strong>Check your email</strong>
              <br />
              Enter the 6-digit code sent to <b>{email}</b>.
            </div>

            <input
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              autoComplete="one-time-code"
              style={{
                width: "100%",
                padding: 16,
                border: "1px solid var(--line)",
                borderRadius: 12,
                margin: "16px 0",
                fontSize: 24,
                letterSpacing: 8,
                textAlign: "center",
              }}
            />

            <button className="primary" disabled={busy || code.length !== 6}>
              {busy ? "Verifying…" : "Verify code"}
            </button>

            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => {
                setSent(false);
                setCode("");
                setMessage("");
                setError("");
              }}
              style={{ marginTop: 10 }}
            >
              Use a different email
            </button>
          </form>
        )}

        {message && <p className="muted" style={{ marginTop: 14 }}>{message}</p>}
        {error && <p style={{ color: "#a33", marginTop: 14 }}>{error}</p>}
        <div className="footer">The code is single-use and expires automatically.</div>
      </div>
    </main>
  );
}
