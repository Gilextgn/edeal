import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { USER_HEADER } from "@/lib/session-header";

const AUTH_PAGES = ["/login", "/signup"];

// Vérifie la session auprès du service d'authentification, la rafraîchit, et
// redirige selon l'état de connexion.
//
// L'identité vérifiée est transmise aux pages dans un en-tête interne, pour
// qu'elles n'aient pas à refaire le même appel réseau (une seule vérification
// par clic). Tout en-tête du même nom envoyé par le navigateur est d'abord
// supprimé : seul ce fichier peut l'écrire. Et quoi qu'il arrive, la base
// applique ses propres règles d'accès à partir du jeton de session.
export async function proxy(request: NextRequest) {
  const refreshed: { name: string; value: string; options: object }[] = [];

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const cookie of cookiesToSet) {
            request.cookies.set(cookie.name, cookie.value);
            refreshed.push(cookie);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PAGES.includes(pathname);

  let response: NextResponse;
  if (!user && !isAuthPage) {
    response = redirectTo(request, "/login");
  } else if (user && isAuthPage) {
    response = redirectTo(request, "/");
  } else {
    const headers = new Headers(request.headers);
    headers.delete(USER_HEADER);
    if (user) headers.set(USER_HEADER, user.id);
    response = NextResponse.next({ request: { headers } });
  }

  for (const { name, value, options } of refreshed) {
    response.cookies.set(name, value, options);
  }
  return response;
}

function redirectTo(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|offline|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|ico|svg|jpg|jpeg|webp)$).*)",
  ],
};
