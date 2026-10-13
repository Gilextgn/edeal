"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { icons } from "./icons";
import { buttonClass, focusRing, type ButtonVariant } from "./ui";

// Fenêtre de confirmation de l'application (et non celle du navigateur) :
// une feuille qui monte du bas sur téléphone, une carte centrée sur
// ordinateur. Échap, le bouton « Annuler » ou un appui à côté referment.

export type ConfirmOptions = {
  message: string;
  title?: string;
  confirmLabel?: string;
  // « danger » pour une suppression ou un refus : bouton rouge.
  tone?: "primary" | "danger";
};

function ConfirmDialog({
  message,
  title,
  confirmLabel,
  tone = "primary",
  onClose,
}: ConfirmOptions & { onClose: (confirmed: boolean) => void }) {
  const t = useTranslations("confirm");
  const ref = useRef<HTMLDialogElement>(null);
  const answered = useRef(false);
  const answer = (confirmed: boolean) => {
    if (answered.current) return;
    answered.current = true;
    ref.current?.close();
    onClose(confirmed);
  };

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onClose={() => answer(false)}
      // Appui sur le voile, autour de la fenêtre : on annule.
      onClick={(event) => {
        if (event.target === ref.current) answer(false);
      }}
      className="m-0 mt-auto w-full max-w-none animate-sheet rounded-t-[2rem] bg-surface p-0 text-fg shadow-pop backdrop:bg-device/60 backdrop:backdrop-blur-[2px] sm:m-auto sm:max-w-sm sm:animate-rise sm:rounded-3xl"
    >
      <div className="flex flex-col items-center px-6 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center sm:pt-6 sm:pb-6">
        <span aria-hidden className="mb-4 block h-1.5 w-12 rounded-full bg-border sm:hidden" />
        <span
          className={`inline-flex size-14 items-center justify-center rounded-full [&>svg]:size-7 ${tone === "danger" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"}`}
        >
          {tone === "danger" ? icons.trash : icons.check}
        </span>
        <h2 id="confirm-title" className="mt-4 text-lg font-extrabold tracking-tight">
          {title ?? t("title")}
        </h2>
        <p className="mt-1.5 text-muted">{message}</p>
        <div className="mt-6 flex w-full flex-col gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => answer(true)}
            className={buttonClass(tone === "danger" ? "danger-solid" : "primary", "w-full")}
          >
            {confirmLabel ?? t("ok")}
          </button>
          <button
            type="button"
            onClick={() => answer(false)}
            className={`min-h-12 w-full rounded-full bg-surface-2 font-semibold ${focusRing}`}
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/**
 * `[fenêtre, demander]` : placer `fenêtre` dans le rendu, puis
 * `await demander({ message })` renvoie vrai si la personne confirme.
 */
export function useConfirm() {
  const [request, setRequest] = useState<
    (ConfirmOptions & { resolve: (confirmed: boolean) => void }) | null
  >(null);
  const ask = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setRequest({ ...options, resolve })),
    [],
  );
  const dialog = request ? (
    <ConfirmDialog
      {...request}
      onClose={(confirmed) => {
        request.resolve(confirmed);
        setRequest(null);
      }}
    />
  ) : null;
  return [dialog, ask] as const;
}

/**
 * Bouton d'envoi qui demande confirmation d'abord. Il vérifie que le
 * formulaire est rempli correctement avant d'ouvrir la fenêtre, puis l'envoie
 * si la personne confirme.
 */
export function ConfirmButton({
  confirm,
  variant = "primary",
  className = "",
  disabled,
  children,
}: {
  confirm: ConfirmOptions;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [dialog, ask] = useConfirm();
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={buttonClass(variant, className)}
        onClick={async () => {
          const form = ref.current?.form;
          if (!form) return;
          if (!form.noValidate && !form.reportValidity()) return;
          if (await ask(confirm)) form.requestSubmit();
        }}
      >
        {children}
      </button>
      {dialog}
    </>
  );
}
