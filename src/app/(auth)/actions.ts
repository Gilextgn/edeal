"use server";

import { redirect } from "next/navigation";
import { parseIdentifier } from "@/domain/identifier";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Clés de messages/fr.json sous "auth.errors".
export type AuthError =
  | "nameRequired"
  | "identifierInvalid"
  | "passwordTooShort"
  | "invalidCredentials"
  | "alreadyRegistered"
  | "generic";

export type AuthState = { error: AuthError; identifier: string; name: string };

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 80;

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    identifier: String(formData.get("identifier") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUp(
  _previous: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  const { name, identifier, password } = readForm(formData);
  const fail = (error: AuthError): AuthState => ({ error, identifier, name });

  if (!name || name.length > MAX_NAME_LENGTH) return fail("nameRequired");
  const parsed = parseIdentifier(
    identifier,
    env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE,
  );
  if (!parsed) return fail("identifierInvalid");
  if (password.length < MIN_PASSWORD_LENGTH) return fail("passwordTooShort");

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
  const fail = (error: AuthError): AuthState => ({
    error,
    identifier,
    name: "",
  });

  const parsed = parseIdentifier(
    identifier,
    env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE,
  );
  if (!parsed || !password) return fail("invalidCredentials");

  const supabase = await createClient();
  const { error } =
    parsed.kind === "email"
      ? await supabase.auth.signInWithPassword({ email: parsed.email, password })
      : await supabase.auth.signInWithPassword({ phone: parsed.phone, password });

  if (error) {
    return fail(
      error.code === "invalid_credentials" ? "invalidCredentials" : "generic",
    );
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
