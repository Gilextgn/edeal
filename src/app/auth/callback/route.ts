import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Retour de Google après le choix du compte : on échange le code reçu contre
// une session, puis on envoie l'utilisateur à l'accueil (qui l'oriente selon
// son profil). En cas d'échec, retour à la connexion avec un message.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const home = request.nextUrl.clone();
  home.search = "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      home.pathname = "/";
      return NextResponse.redirect(home);
    }
  }

  home.pathname = "/login";
  home.searchParams.set("error", "google");
  return NextResponse.redirect(home);
}
