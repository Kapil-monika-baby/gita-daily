import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CANONICAL_HOST = "gita-daily-nine.vercel.app";

export async function GET(request: Request) {
  const url = new URL(request.url);

  // PKCE session cookies are host-scoped. If an old/preview Vercel URL is
  // used from an email link, move the callback to the canonical origin before
  // exchanging the code so the verifier cookie remains on the same origin.
  if (url.hostname.toLowerCase() !== CANONICAL_HOST) {
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }

  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/auth?error=auth_callback_failed", url.origin));
}
