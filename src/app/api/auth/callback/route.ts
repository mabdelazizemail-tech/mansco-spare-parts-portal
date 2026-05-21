import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    // Build the redirect response first so we can attach cookies to it
    const redirectResponse = NextResponse.redirect(`${origin}/pending-approval`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          // FIX (G1): setAll must write cookies onto the *response*, not just
          // the incoming request object, otherwise the session is lost on redirect.
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const status = data.session?.user?.user_metadata?.registration_status;
      const destination = status === "approved" ? "/dashboard" : "/pending-approval";

      const forwardedHost = req.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      let finalUrl: string;
      if (isLocalEnv) {
        finalUrl = `${origin}${destination}`;
      } else if (forwardedHost) {
        finalUrl = `https://${forwardedHost}${destination}`;
      } else {
        finalUrl = `${origin}${destination}`;
      }

      // Reuse the same response so session cookies are preserved
      const response = NextResponse.redirect(finalUrl);
      redirectResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
        response.cookies.set(name, value, opts as Parameters<typeof response.cookies.set>[2]);
      });
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_callback_error`);
}
