"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { parseIdentifier } from "@/domain/identifier";
import { passwordIssues } from "@/domain/password";
import { env } from "@/lib/env";
import { loginLockSeconds, recordLoginAttempt } from "@/lib/login-throttle";
import { createClient } from "@/lib/supabase/server";

// Clés de messages/fr.json sous "auth.errors".
export type AuthError =
  | "nameRequired"
  | "identifierInvalid"
  | "password_too_short"
  | "password_needs_letter"
  | "password_needs_digit"
  | "password_too_common"
  | "password_contains_identifier"
  | "passwordMismatch"
  | "invalidCredentials"
  | "locked"
  | "alreadyRegistered"
  | "generic";

export type AuthState = {
  error: AuthError;
  identifier: string;
  name: string;
  // Minutes d'attente quand la connexion est bloquée.
  minutes?: number;
};

const MAX_NAME_LENGTH = 80;

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    identifier: String(formData.get("identifier") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
  };
}

export async function signUp(
  _previous: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  const { name, identifier, password, confirmation } = readForm(formData);
  const fail = (error: AuthError): AuthState => ({ error, identifier, name });

  if (!name || name.length > MAX_NAME_LENGTH) return fail("nameRequired");
  const parsed = parseIdentifier(
    identifier,
    env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE,
  );
  if (!parsed) return fail("identifierInvalid");

  const [issue] = passwordIssues(password, identifier);
  if (issue) return fail(`password_${issue}`);
  if (password !== confirmation) return fail("passwordMismatch");

  const supabase = await createClient();
  const options = { data: { name } };
  const { data, error } =
    parsed.kind === "email"
      ? await supabase.auth.signUp({ email: parsed.email, password, options })
      : await supabase.auth.signUp({ phone: parsed.phone, password, options });

  if (error) {
    return fail(
      error.code === "user_already_exists" ? "alreadyRegistered" : "generic",
    );
  }
  if (!data.session) return fail("generic");

  redirect("/");
}

export async function signIn(
  _previous: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  const { identifier, password } = readForm(formData);
  const fail = (error: AuthError, minutes?: number): AuthState => ({
    error,
    identifier,
    name: "",
    minutes,
  });

  const parsed = parseIdentifier(
    identifier,
    env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE,
  );
  if (!parsed || !password) return fail("invalidCredentials");
  const account = parsed.kind === "email" ? parsed.email : parsed.phone;

  // Trop d'essais ratés sur ce compte : on n'interroge même plus le mot de passe.
  const wait = await loginLockSeconds(account);
  if (wait > 0) return fail("locked", Math.ceil(wait / 60));

  const supabase = await createClient();
  const { data, error } =
    parsed.kind === "email"
      ? await supabase.auth.signInWithPassword({ email: parsed.email, password })
      : await supabase.auth.signInWithPassword({ phone: parsed.phone, password });

  if (error && error.code !== "invalid_credentials") return fail("generic");
  if (error) {
    await recordLoginAttempt(account, false);
    const lockedFor = await loginLockSeconds(account);
    return lockedFor > 0 ? fail("locked", Math.ceil(lockedFor / 60)) : fail("invalidCredentials");
  }
  // Connexion réussie : la remise à zéro du compteur se fait après la
  // réponse, pour ne pas faire attendre l'utilisateur.
  after(() => recordLoginAttempt(account, true));

  // Va droit à la bonne page : le tableau de bord de la boutique quand il n'y
  // en a qu'une, sinon l'accueil (qui applique la même règle).
  const { data: memberships } = await supabase
    .from("memberships")
    .select("shop_id")
    .eq("user_id", data.user.id);
  redirect(memberships?.length === 1 ? `/s/${memberships[0].shop_id}` : "/");
}

// Connexion avec un compte Google : l'utilisateur choisit son adresse chez
// Google, qui le renvoie ensuite sur /auth/callback.
export async function signInWithGoogle() {
  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      // Toujours proposer le choix du compte, même s'il n'y en a qu'un.
      queryParams: { prompt: "select_account" },
    },
  });
  redirect(data?.url ?? "/login?error=google");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
