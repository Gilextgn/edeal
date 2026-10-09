import { useTranslations } from "next-intl";
import { FormMessage, focusRing } from "@/components/ui";
import { signInWithGoogle } from "./actions";

// Sous le formulaire : « Ou connectez-vous avec », puis le bouton Google en
// pleine largeur.
export function GoogleButton({ failed }: { failed: boolean }) {
  const t = useTranslations("auth");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-xs font-semibold text-fg">{t("orWith")}</p>
      {failed ? <FormMessage tone="danger">{t("errors.google")}</FormMessage> : null}
      <form action={signInWithGoogle}>
        <button
          type="submit"
          aria-label={t("google")}
          className={`flex min-h-13 w-full items-center justify-center gap-3 rounded-xl bg-surface-2 px-5 text-sm font-semibold transition hover:bg-border active:scale-[0.98] ${focusRing}`}
        >
          {/* Logo officiel de Google : ses quatre couleurs sont imposées par la marque. */}
          <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.7-9.8 6.7-17.4z" />
            <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2.2 1.5-5 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          {t("googleShort")}
        </button>
      </form>
    </div>
  );
}
