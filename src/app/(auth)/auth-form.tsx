"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, FormMessage } from "@/components/ui";
import { signIn, signUp } from "./actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(
    mode === "signup" ? signUp : signIn,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {mode === "signup" ? (
        <Field
          name="name"
          label={t("name")}
          autoComplete="name"
          maxLength={80}
          required
          defaultValue={state?.name}
        />
      ) : null}
      <Field
        name="identifier"
        label={t("identifier")}
        hint={t("identifierHint")}
        autoComplete="username"
        autoCapitalize="none"
        required
        defaultValue={state?.identifier}
      />
      <Field
        name="password"
        type="password"
        label={t("password")}
        hint={mode === "signup" ? t("passwordHint") : undefined}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        minLength={mode === "signup" ? 8 : undefined}
        required
      />
      {state ? (
        <FormMessage tone="danger">{t(`errors.${state.error}`)}</FormMessage>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("pending") : t(mode === "signup" ? "signup" : "login")}
      </Button>
    </form>
  );
}
