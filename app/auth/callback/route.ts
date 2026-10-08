import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!code && !tokenHash) return redirect("/auth?error=missing_code");

  const response = NextResponse.redirect(new URL("/", request.url));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers.get("cookie")
            ? request.headers.get("cookie")!.split(";").map(v => {
                const i = v.indexOf("=");
                return { name: v.slice(0, i).trim(), value: decodeURIComponent(v.slice(i + 1).trim()) };
              })
            : [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  let error: { message: string } | null = null;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && otpType && allowedOtpTypes.has(otpType)) {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as "email" | "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email_change_new" | "email_change_current",
    }));
  } else {
    return redirect("/auth?error=invalid_auth_link");
  }

  if (error) return redirect("/auth?error=auth_callback_failed");

  return response;
}
