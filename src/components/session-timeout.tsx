"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { icons } from "./icons";
import { buttonClass, focusRing } from "./ui";

// Déconnexion après une période sans activité, pour qu'un téléphone oublié
// sur le comptoir ne reste pas ouvert. Une minute avant, une fenêtre prévient
// et laisse le choix ; sans réponse, la session se ferme et une seconde
// fenêtre le dit, avec un bouton pour se reconnecter : sur téléphone, on ne
// recharge pas la page comme dans un navigateur, il faut le montrer.
//
// La dernière activité est notée dans le navigateur : tous les onglets ouverts
// la partagent. Un téléphone mis en veille est contrôlé dès qu'il se rallume.
export const IDLE_MINUTES = 15;
const IDLE_MS = IDLE_MINUTES * 60_000;
const WARNING_MS = 60_000;
const KEY = "edeal:last-activity";

/** À la connexion et à la déconnexion : on repart de zéro. */
export function resetActivity() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}
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

const sheet =
  "m-0 mt-auto w-full max-w-none animate-sheet rounded-t-[2rem] bg-surface p-0 text-fg shadow-pop sm:m-auto sm:max-w-sm sm:animate-rise sm:rounded-3xl";

export function SessionTimeout({
  onExpire,
  onLogout,
}: {
  // Ferme la session sans quitter l'écran (la fenêtre « déconnecté » suit).
  onExpire: () => Promise<void>;
  // Déconnexion choisie par la personne : retour direct à la connexion.
  onLogout: () => void;
}) {
  const t = useTranslations("session");
  const [phase, setPhase] = useState<"active" | "warning" | "ended">("active");
  const [remaining, setRemaining] = useState(0);
  const phaseRef = useRef(phase);
  const warningDialog = useRef<HTMLDialogElement>(null);
  const endedDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    phaseRef.current = phase;
    const show = (dialog: HTMLDialogElement | null, open: boolean) => {
      if (!dialog) return;
      if (open && !dialog.open) dialog.showModal();
      if (!open && dialog.open) dialog.close();
    };
    show(warningDialog.current, phase === "warning");
    show(endedDialog.current, phase === "ended");
  }, [phase]);

  useEffect(() => {
    // Première page après la connexion : le compteur démarre maintenant.
    // Sinon on garde la dernière activité connue : une page rechargée au
    // réveil d'un téléphone resté longtemps en veille ne prolonge pas la
    // session (le contrôle ci-dessous se fait tout de suite).
    try {
      if (!localStorage.getItem(KEY)) writeLast(Date.now());
    } catch {
      // Stockage indisponible : readLast renvoie l'heure courante.
    }
    let lastWrite = 0;
    const onActivity = () => {
      // Pendant l'avertissement, seul le bouton « Rester connecté » compte.
      if (phaseRef.current !== "active") return;
      const now = Date.now();
      if (now - lastWrite > 15_000) {
        lastWrite = now;
        writeLast(now);
      }
    };
    const check = () => {
      if (phaseRef.current === "ended") return;
      const idle = Date.now() - readLast();
      if (idle >= IDLE_MS) {
        phaseRef.current = "ended";
        setPhase("ended");
        // Hors connexion, la fermeture côté serveur peut échouer : la fenêtre
        // s'affiche quand même et l'écran de connexion prendra le relais.
        onExpire().catch(() => {});
      } else if (idle >= IDLE_MS - WARNING_MS) {
        setRemaining(Math.ceil((IDLE_MS - idle) / 1000));
        setPhase("warning");
      } else if (phaseRef.current === "warning") {
        setPhase("active");
      }
    };
    for (const name of ACTIVITY) window.addEventListener(name, onActivity, { passive: true });
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 1000);
    check();
    return () => {
      for (const name of ACTIVITY) window.removeEventListener(name, onActivity);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, [onExpire]);

  const stay = () => {
    writeLast(Date.now());
    setPhase("active");
  };

  return (
    <>
      <dialog
        ref={warningDialog}
        aria-labelledby="timeout-title"
        // Échap : on reste connecté, comme avec le bouton.
        onCancel={(event) => {
          event.preventDefault();
          stay();
        }}
        className={`${sheet} backdrop:bg-device/60 backdrop:backdrop-blur-[2px]`}
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
            {t("message", { seconds: remaining, minutes: IDLE_MINUTES })}
          </p>
          <div className="mt-6 flex w-full flex-col gap-3">
            <button type="button" autoFocus onClick={stay} className={buttonClass("primary", "w-full")}>
              {t("stay")}
            </button>
            <button
              type="button"
              onClick={() => {
                phaseRef.current = "ended";
                onLogout();
              }}
              className={`min-h-12 w-full rounded-full bg-surface-2 font-semibold ${focusRing}`}
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </dialog>

      {/* Session fermée : l'écran derrière est masqué, une seule issue. */}
      <dialog
        ref={endedDialog}
        aria-labelledby="ended-title"
        onCancel={(event) => event.preventDefault()}
        className={`${sheet} backdrop:bg-device/85 backdrop:backdrop-blur-md`}
      >
        <div className="flex flex-col items-center px-6 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center sm:pt-6 sm:pb-6">
          <span aria-hidden className="mb-4 block h-1.5 w-12 rounded-full bg-border sm:hidden" />
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary [&>svg]:size-7">
            {icons.logout}
          </span>
          <h2 id="ended-title" className="mt-4 text-lg font-extrabold tracking-tight">
            {t("endedTitle")}
          </h2>
          <p className="mt-1.5 text-muted">{t("endedMessage", { minutes: IDLE_MINUTES })}</p>
          <div className="mt-6 flex w-full flex-col">
            {/* Rechargement complet : repart d'un écran de connexion propre. */}
            <a href="/login" autoFocus className={buttonClass("primary", "w-full")}>
              {t("signInAgain")}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
