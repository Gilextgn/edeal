"use client";

import Link from "next/link";
import { useActionState, useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { icons } from "@/components/icons";
import { FormMessage, focusRing } from "@/components/ui";
import { passwordIssues, passwordStrength } from "@/domain/password";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";

// Champs « pleins », sans bordure : le libellé sert de texte d'attente dans le
// champ, et reste lu par les lecteurs d'écran.
const control = `min-h-13 w-full rounded-xl bg-surface-2 px-4 text-base text-fg placeholder:text-muted ${focusRing}`;

function AuthField({ label, name, ...props }: ComponentProps<"input"> & { label: string; name: string }) {
  return (
    <div>
      <label htmlFor={name} className="sr-only">
        {label}
      </label>
      <input id={name} name={name} placeholder={label} className={control} {...props} />
    </div>
  );
}

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
    <div className="relative">
      <label htmlFor={name} className="sr-only">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={label}
        required
        className={`${control} pr-14`}
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
  );
}

const strengthTones = ["bg-border", "bg-danger", "bg-warning", "bg-success", "bg-success"];

const submit = `mt-2 min-h-13 w-full rounded-xl bg-primary text-base font-semibold text-on-primary transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60 ${focusRing}`;

// Force du mot de passe en cours de saisie, et ce qui lui manque.
function PasswordHelp({ password, identifier }: { password: string; identifier: string }) {
  const t = useTranslations("auth");
  const issues = passwordIssues(password, identifier);
  const strength = passwordStrength(password);
  return (
    <div aria-live="polite" className="-mt-1 flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={`h-1.5 rounded-full ${step <= strength ? strengthTones[strength] : "bg-border"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted">
        {password.length === 0
          ? t("passwordHint")
          : issues.length > 0
            ? t(`errors.password_${issues[0]}`)
            : t(`strength.${strength}`)}
      </p>
    </div>
  );
}

// Mot de passe oublié, étape 1 : demander le lien par e-mail.
export function ForgotForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  if (state?.sent) {
    return (
      <FormMessage tone="success">{t("resetSent", { email: state.identifier ?? "" })}</FormMessage>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <AuthField
        name="identifier"
        label={t("email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        required
        defaultValue={state?.identifier}
      />
      {state?.error ? <FormMessage tone="danger">{t(`errors.${state.error}`)}</FormMessage> : null}
      <button type="submit" disabled={pending} className={submit}>
        {pending ? t("pending") : t("resetSend")}
      </button>
    </form>
  );
}

// Mot de passe oublié, étape 2 : choisir le nouveau mot de passe.
export function ResetForm({ identifier }: { identifier: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(updatePassword, null);
  const [password, setPassword] = useState("");

  return (
    <form action={action} className="flex flex-col gap-4">
      <PasswordField
        name="password"
        label={t("newPassword")}
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <PasswordHelp password={password} identifier={identifier} />
      <PasswordField name="confirmation" label={t("confirmation")} autoComplete="new-password" />
      {state?.error ? <FormMessage tone="danger">{t(`errors.${state.error}`)}</FormMessage> : null}
      <button type="submit" disabled={pending} className={submit}>
        {pending ? t("pending") : t("resetSave")}
      </button>
    </form>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(
    mode === "signup" ? signUp : signIn,
    null,
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const signup = mode === "signup";

  return (
    <form action={action} className="flex flex-col gap-4">
      {signup ? (
        <AuthField
          name="name"
          label={t("name")}
          autoComplete="name"
          maxLength={80}
          required
          defaultValue={state?.name}
        />
      ) : null}
      <AuthField
        name="identifier"
        label={t("identifier")}
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
          <PasswordHelp password={password} identifier={identifier} />
          <PasswordField
            name="confirmation"
            label={t("confirmation")}
            autoComplete="new-password"
          />
        </>
      ) : (
        <>
          <PasswordField name="password" label={t("password")} autoComplete="current-password" />
          <Link
            href="/forgot"
            className={`-mt-2 inline-flex min-h-11 items-center self-end rounded-lg text-xs font-semibold ${focusRing}`}
          >
            {t("forgot")}
          </Link>
        </>
      )}

      {state ? (
        <FormMessage tone="danger">
          {t(`errors.${state.error}`, { minutes: state.minutes ?? 15 })}
        </FormMessage>
      ) : null}
      <button type="submit" disabled={pending} className={submit}>
        {pending ? t("pending") : t(signup ? "signup" : "login")}
      </button>
    </form>
  );
}
