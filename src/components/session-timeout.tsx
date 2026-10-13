"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { icons } from "./icons";
import { buttonClass, focusRing } from "./ui";

// Déconnexion après une période sans activité, pour qu'un téléphone oublié
// sur le comptoir ne reste pas ouvert. Une minute avant, une fenêtre prévient
// et laisse le choix ; sans réponse, la session se ferme.
//
// La dernière activité est notée dans le navigateur : tous les onglets ouverts
// la partagent. Un téléphone mis en veille est contrôlé dès qu'il se rallume.
export const IDLE_MINUTES = 30;
const IDLE_MS = IDLE_MINUTES * 60_000;
const WARNING_MS = 60_000;
const KEY = "edeal:last-activity";
const ACTIVITY = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

function readLast() {
  try {
    return Number(localStorage.getItem(KEY)) || Date.now();
  } catch {
    return Date.now();
  }
}

function writeLast(time: number) {
  try {
    localStorage.setItem(KEY, String(time));
  } catch {
    // Stockage indisponible (navigation privée…) : on se contente de l'onglet.
  }
}

export function SessionTimeout({ onExpire }: { onExpire: () => void }) {
  const t = useTranslations("session");
  // Secondes restantes quand l'avertissement est affiché, sinon null.
  const [remaining, setRemaining] = useState<number | null>(null);
  const warning = remaining !== null;
  const expired = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    writeLast(Date.now());
    let lastWrite = 0;
    const onActivity = () => {
      // Pendant l'avertissement, seul le bouton « Rester connecté » compte.
      if (dialog.current?.open) return;
      const now = Date.now();
      if (now - lastWrite > 15_000) {
        lastWrite = now;
        writeLast(now);
      }
    };
    const check = () => {
      if (expired.current) return;
      const idle = Date.now() - readLast();
      if (idle >= IDLE_MS) {
        expired.current = true;
        setRemaining(null);
        onExpire();
      } else if (idle >= IDLE_MS - WARNING_MS) {
        setRemaining(Math.ceil((IDLE_MS - idle) / 1000));
      } else {
        setRemaining(null);
      }
    };
    for (const name of ACTIVITY) window.addEventListener(name, onActivity, { passive: true });
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 1000);
    return () => {
      for (const name of ACTIVITY) window.removeEventListener(name, onActivity);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, [onExpire]);

  // Ouvre ou referme la fenêtre selon l'état.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (warning && !element.open) element.showModal();
    if (!warning && element.open) element.close();
  }, [warning]);

  const stay = () => {
    writeLast(Date.now());
    setRemaining(null);
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="timeout-title"
      // Échap : on reste connecté, comme avec le bouton.
      onCancel={(event) => {
        event.preventDefault();
        stay();
      }}
      className="m-0 mt-auto w-full max-w-none animate-sheet rounded-t-[2rem] bg-surface p-0 text-fg shadow-pop backdrop:bg-device/60 backdrop:backdrop-blur-[2px] sm:m-auto sm:max-w-sm sm:animate-rise sm:rounded-3xl"
    >
      <div className="flex flex-col items-center px-6 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center sm:pt-6 sm:pb-6">
        <span aria-hidden className="mb-4 block h-1.5 w-12 rounded-full bg-border sm:hidden" />
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-warning-soft text-warning [&>svg]:size-7">
          {icons.shield}
        </span>
        <h2 id="timeout-title" className="mt-4 text-lg font-extrabold tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-1.5 text-muted" aria-live="polite">
          {t("message", { seconds: remaining ?? 0, minutes: IDLE_MINUTES })}
        </p>
        <div className="mt-6 flex w-full flex-col gap-3">
          <button type="button" autoFocus onClick={stay} className={buttonClass("primary", "w-full")}>
            {t("stay")}
          </button>
          <button
            type="button"
            onClick={() => {
              expired.current = true;
              onExpire();
            }}
            className={`min-h-12 w-full rounded-full bg-surface-2 font-semibold ${focusRing}`}
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
