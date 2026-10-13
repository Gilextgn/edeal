"use client";

import { useSyncExternalStore } from "react";
import { NETWORK_ERROR } from "@/lib/network";
import { icons } from "./icons";
import { focusRing } from "./ui";

export type ErrorTexts = {
  title: string;
  network: string;
  generic: string;
  retry: string;
  home: string;
};

const subscribe = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

// Écran d'erreur lisible par tous : ce qui s'est passé en une phrase, et deux
// gestes simples (réessayer, revenir à l'accueil). Jamais de détail technique.
export function ErrorScreen({
  error,
  retry,
  texts,
}: {
  error: Error;
  retry: () => void;
  texts: ErrorTexts;
}) {
  // Hors ligne, ou serveur injoignable signalé par la page : on parle de la
  // connexion. Sinon, message général (qui la mentionne aussi).
  const offline = useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false,
  );
  const network = offline || error.message === NETWORK_ERROR;

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 py-12 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary [&>svg]:size-8">
        {icons.alert}
      </span>
      <h1 className="mt-5 text-xl font-extrabold tracking-tight">{texts.title}</h1>
      <p className="mt-2 max-w-sm text-muted">{network ? texts.network : texts.generic}</p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className={`min-h-12 rounded-full bg-primary px-6 font-semibold text-on-primary transition hover:bg-primary-hover active:scale-[0.98] ${focusRing}`}
        >
          {texts.retry}
        </button>
        {/* Lien simple (rechargement complet) : marche même si l'application est en panne. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className={`inline-flex min-h-12 items-center justify-center rounded-full bg-surface-2 px-6 font-semibold ${focusRing}`}
        >
          {texts.home}
        </a>
      </div>
    </div>
  );
}
