"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { parseIdentifier } from "@/domain/identifier";
import { passwordIssues } from "@/domain/password";
import { env } from "@/lib/env";
import { loginLockSeconds, recordLoginAttempt } from "@/lib/login-throttle";
import { isNetworkError } from "@/lib/network";
import { adminClient } from "@/lib/supabase/admin";
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
  | "network"
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

async function signUpUnguarded(
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

  // Inscription par numéro : l'application n'envoie pas de SMS, donc pas de
  // confirmation possible côté Supabase. Le compte est créé par le serveur,
  // numéro tenu pour confirmé, puis la personne est connectée aussitôt.
  if (parsed.kind === "phone") {
    const created = await adminClient().auth.admin.createUser({
      phone: parsed.phone,
      password,
      phone_confirm: true,
      user_metadata: { name },
    });
    if (created.error) {
      if (created.error.code === "phone_exists") return fail("alreadyRegistered");
      console.error("signUp (numéro) :", created.error.code, created.error.message);
      return fail(isNetworkError(created.error) ? "network" : "generic");
    }
    const signedIn = await supabase.auth.signInWithPassword({ phone: parsed.phone, password });
    if (signedIn.error) {
      console.error("signUp (connexion) :", signedIn.error.code, signedIn.error.message);
      return fail(isNetworkError(signedIn.error) ? "network" : "generic");
    }
    redirect("/");
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password,
    options: { data: { name } },
  });

  if (error) {
    if (error.code === "user_already_exists") return fail("alreadyRegistered");
    console.error("signUp :", error.code, error.message);
    return fail(isNetworkError(error) ? "network" : "generic");
  }
  // Compte créé mais pas de session : le projet exige une confirmation.
  if (!data.session) {
    console.error("signUp : compte créé sans session (confirmation exigée par Supabase)");
    return fail("generic");
  }

  redirect("/");
}

async function signInUnguarded(
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

  if (error && error.code !== "invalid_credentials") {
    console.error("signIn :", error.code, error.message);
    return fail(isNetworkError(error) ? "network" : "generic");
  }
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

// ---------- Mot de passe oublié ----------

export type RecoveryError =
  | "identifierInvalid"
  | "resetNeedsEmail"
  | "resetTooMany"
  | "resetSamePassword"
  | "codeInvalid"
  | "network"
  | "passwordMismatch"
  | "password_too_short"
  | "password_needs_letter"
  | "password_needs_digit"
  | "password_too_common"
  | "password_contains_identifier"
  | "generic";

export type RecoveryState = { error?: RecoveryError; sent?: boolean; identifier?: string };

// Envoie par e-mail un lien pour choisir un nouveau mot de passe. La réponse
// est la même que le compte existe ou non : on ne révèle pas qui est inscrit.
// Un compte créé avec un numéro seul n'a pas d'adresse où écrire.
async function requestPasswordResetUnguarded(
  _previous: RecoveryState | null,
  formData: FormData,
): Promise<RecoveryState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const parsed = parseIdentifier(identifier, env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE);
  if (!parsed) return { error: "identifierInvalid", identifier };
  if (parsed.kind !== "email") return { error: "resetNeedsEmail", identifier };

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.email, {
    redirectTo: `${origin}/auth/confirm`,
  });
  if (error) {
    console.error("requestPasswordReset :", error.code, error.message);
    return {
      error:
        error.code === "over_email_send_rate_limit"
          ? "resetTooMany"
          : isNetworkError(error)
            ? "network"
            : "generic",
      identifier,
    };
  }
  return { sent: true, identifier };
}

// Même écran, étape suivante : le code à 6 chiffres reçu par e-mail et le
// nouveau mot de passe. On n'a pas à quitter l'application pour ouvrir un
// lien. Le mot de passe est contrôlé avant le code, pour ne pas consommer le
// code sur un mot de passe refusé.
async function resetWithCodeUnguarded(
  _previous: RecoveryState | null,
  formData: FormData,
): Promise<RecoveryState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const fail = (error: RecoveryError): RecoveryState => ({ error, sent: true, identifier });

  const parsed = parseIdentifier(identifier, env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE);
  if (parsed?.kind !== "email") return { error: "identifierInvalid", identifier };
  if (code.length !== 6) return fail("codeInvalid");
  const [issue] = passwordIssues(password, parsed.email);
  if (issue) return fail(`password_${issue}`);
  if (password !== confirmation) return fail("passwordMismatch");

  const supabase = await createClient();
  const verified = await supabase.auth.verifyOtp({
    email: parsed.email,
    token: code,
    type: "recovery",
  });
  if (verified.error) return fail(isNetworkError(verified.error) ? "network" : "codeInvalid");

  // Le code a servi : la personne est connectée. Si l'enregistrement échoue
  // (même mot de passe que l'ancien…), elle termine sur l'écran dédié.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("resetWithCode :", error.code, error.message);
    redirect("/reset");
  }
  redirect("/");
}

// Enregistre le nouveau mot de passe. La personne est connectée : elle arrive
// ici par le lien reçu par e-mail (`/auth/confirm`).
async function updatePasswordUnguarded(
  _previous: RecoveryState | null,
  formData: FormData,
): Promise<RecoveryState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=link");

  const [issue] = passwordIssues(password, user.email ?? user.phone ?? "");
  if (issue) return { error: `password_${issue}` };
  if (password !== confirmation) return { error: "passwordMismatch" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "resetSamePassword" };
    console.error("updatePassword :", error.code, error.message);
    return { error: isNetworkError(error) ? "network" : "generic" };
  }
  redirect("/");
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

// ---------- Versions exportées ----------
// Si le serveur est injoignable (connexion coupée ou trop lente), on renvoie
// un message clair à la place d'une erreur technique. Les redirections et
// les autres erreurs passent telles quelles.

async function withNetworkMessage<T>(run: () => Promise<T>, offline: () => T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    console.error("Serveur injoignable :", error);
    return offline();
  }
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function signUp(previous: AuthState | null, formData: FormData): Promise<AuthState> {
  return withNetworkMessage(
    () => signUpUnguarded(previous, formData),
    () => ({ error: "network", identifier: field(formData, "identifier"), name: field(formData, "name") }),
  );
}

export async function signIn(previous: AuthState | null, formData: FormData): Promise<AuthState> {
  return withNetworkMessage(
    () => signInUnguarded(previous, formData),
    () => ({ error: "network", identifier: field(formData, "identifier"), name: "" }),
  );
}

export async function requestPasswordReset(
  previous: RecoveryState | null,
  formData: FormData,
): Promise<RecoveryState> {
  return withNetworkMessage(
    () => requestPasswordResetUnguarded(previous, formData),
    () => ({ error: "network", identifier: field(formData, "identifier") }),
  );
}

export async function resetWithCode(
  previous: RecoveryState | null,
  formData: FormData,
): Promise<RecoveryState> {
  return withNetworkMessage(
    () => resetWithCodeUnguarded(previous, formData),
    () => ({ error: "network", sent: true, identifier: field(formData, "identifier") }),
  );
}

export async function updatePassword(
  previous: RecoveryState | null,
  formData: FormData,
): Promise<RecoveryState> {
  return withNetworkMessage(
    () => updatePasswordUnguarded(previous, formData),
    () => ({ error: "network" }),
  );
}
