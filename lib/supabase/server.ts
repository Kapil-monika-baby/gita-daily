import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
            Object.entries(headers ?? {}).forEach(([key, value]) => {
              // Route handlers can safely set these headers on the response.
              // Cookie persistence is handled by Next.js's cookies() API.
              void key;
              void value;
            });
          } catch {
            // Cookie writes from Server Components can be ignored;
            // the Proxy refreshes sessions on subsequent requests.
          }
        },
      },
    },
  );
}
