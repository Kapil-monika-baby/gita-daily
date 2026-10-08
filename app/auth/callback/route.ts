import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedOtpTypes = new Set([
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email_change_new",
  "email_change_current",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type");

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", request.url));
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL("/auth?error=auth_callback_failed", request.url),
      );
    }
  } else if (tokenHash && otpType && allowedOtpTypes.has(otpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as "email" | "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email_change_new" | "email_change_current",
    });
    if (error) {
      return NextResponse.redirect(
        new URL("/auth?error=auth_callback_failed", request.url),
      );
    }
  } else {
    return NextResponse.redirect(new URL("/auth?error=invalid_auth_link", request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
