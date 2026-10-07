"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { icons } from "@/components/icons";
import { Button, Field, FormMessage, focusRing } from "@/components/ui";
import { passwordIssues, passwordStrength } from "@/domain/password";
import { signIn, signUp } from "./actions";

const control = `min-h-12 w-full rounded-2xl border border-border bg-surface px-4 pr-14 text-base text-fg ${focusRing}`;

// Champ mot de passe avec bouton « afficher / masquer ».
function PasswordField({
  name,
  label,
  autoComplete,
  value,
  onChange,
}: {
  name: string;
  label: string;
  autoComplete: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          className={control}
          {...(onChange ? { value, onChange: (event) => onChange(event.target.value) } : {})}
        />
        <button
          type="button"
          aria-label={t(visible ? "hidePassword" : "showPassword")}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
          className={`absolute right-1 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-fg ${focusRing}`}
        >
          {visible ? icons.eyeOff : icons.eye}
        </button>
      </div>
    </div>
  );
}

const strengthTones = ["bg-border", "bg-danger", "bg-warning", "bg-success", "bg-success"];

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(
    mode === "signup" ? signUp : signIn,
    null,
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const signup = mode === "signup";
  const issues = passwordIssues(password, identifier);
  const strength = passwordStrength(password);

  return (
    <form action={action} className="flex flex-col gap-4">
      {signup ? (
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
        onChange={(event) => setIdentifier(event.target.value)}
      />

      {signup ? (
        <>
          <PasswordField
            name="password"
            label={t("password")}
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
          />
          {/* Aide en direct : force du mot de passe et ce qui lui manque. */}
          <div aria-live="polite" className="-mt-1 flex flex-col gap-1.5">
            <div className="grid grid-cols-4 gap-1.5" aria-hidden>
              {[1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={`h-1.5 rounded-full ${step <= strength ? strengthTones[strength] : "bg-border"}`}
                />
              ))}
            </div>
            <p className="text-sm text-muted">
              {password.length === 0
                ? t("passwordHint")
                : issues.length > 0
                  ? t(`errors.password_${issues[0]}`)
                  : t(`strength.${strength}`)}
            </p>
          </div>
          <PasswordField
            name="confirmation"
            label={t("confirmation")}
            autoComplete="new-password"
          />
        </>
      ) : (
        <PasswordField name="password" label={t("password")} autoComplete="current-password" />
      )}

      {state ? (
        <FormMessage tone="danger">
          {t(`errors.${state.error}`, { minutes: state.minutes ?? 15 })}
        </FormMessage>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("pending") : t(signup ? "signup" : "login")}
      </Button>
      {signup ? null : (
        <p className="flex items-center gap-2 text-xs text-muted">
          <span className="text-success">{icons.shield}</span>
          {t("protected")}
        </p>
      )}
    </form>
  );
}
