import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lien « mot de passe oublié » reçu par e-mail : il ouvre une session, puis
// on montre l'écran du nouveau mot de passe. Il ne sert qu'une fois ; périmé
// ou déjà utilisé, retour à la connexion avec un message.
//
// Deux formes de lien arrivent ici :
// - `token_hash` : notre modèle d'e-mail (supabase/templates/recovery.html),
//   qui fonctionne même si le lien est ouvert sur un autre appareil ;
// - `code` : le modèle par défaut de Supabase, valable seulement dans le
//   navigateur qui a fait la demande.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const target = request.nextUrl.clone();
  target.search = "";

  const supabase = await createClient();
  const { error } =
    tokenHash && params.get("type") === "recovery"
      ? await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error("lien incomplet") };

  if (error) {
    target.pathname = "/login";
    target.searchParams.set("error", "link");
  } else {
    target.pathname = "/reset";
  }
  return NextResponse.redirect(target);
}
