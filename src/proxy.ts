import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { USER_HEADER } from "@/lib/session-header";

// Écrans réservés aux personnes non connectées.
const AUTH_PAGES = ["/login", "/signup", "/forgot"];
// Routes qui créent elles-mêmes la session : retour de Google, lien reçu par
// e-mail pour un mot de passe oublié.
const SESSION_ROUTES = ["/auth/callback", "/auth/confirm"];

// Vérifie la session (sur place, voir plus bas), la rafraîchit au besoin, et
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

  // Le jeton de session est signé par Supabase (clé ES256) : on vérifie sa
  // signature sur place, sans aller-retour réseau à chaque clic. La clé
  // publique n'est téléchargée qu'une fois, puis gardée en mémoire. Un jeton
  // expiré est d'abord renouvelé (là, un appel réseau).
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  // Compte créé par le superadmin avec un mot de passe provisoire : tant qu'il
  // n'est pas remplacé, seul l'écran du nouveau mot de passe est accessible.
  const mustChangePassword = Boolean(
    (data?.claims?.user_metadata as { must_change_password?: boolean } | undefined)
      ?.must_change_password,
  );

  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PAGES.includes(pathname);
  const isCallback = SESSION_ROUTES.includes(pathname);

  let response: NextResponse;
  if (!userId && !isAuthPage && !isCallback) {
    response = redirectTo(request, "/login");
  } else if (userId && mustChangePassword && pathname !== "/reset" && !isCallback) {
    response = redirectTo(request, "/reset");
  } else if (userId && isAuthPage) {
    response = redirectTo(request, "/");
  } else {
    const headers = new Headers(request.headers);
    headers.delete(USER_HEADER);
    if (userId) headers.set(USER_HEADER, userId);
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
