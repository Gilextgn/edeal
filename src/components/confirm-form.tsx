"use client";

import { useRef, type ReactNode } from "react";
import { useConfirm } from "./confirm";

// Formulaire d'une action sans retour (supprimer, annuler) : demande une
// confirmation, dans la fenêtre de l'application, avant d'envoyer.
export function ConfirmForm({
  action,
  message,
  confirmLabel,
  children,
}: {
  action: () => Promise<void>;
  message: string;
  confirmLabel?: string;
  children: ReactNode;
}) {
  const [dialog, ask] = useConfirm();
  const confirmed = useRef(false);

  return (
    <form
      action={action}
      onSubmit={async (event) => {
        if (confirmed.current) {
          confirmed.current = false;
          return;
        }
        event.preventDefault();
        const form = event.currentTarget;
        if (await ask({ message, confirmLabel, tone: "danger" })) {
          confirmed.current = true;
          form.requestSubmit();
        }
      }}
    >
      {children}
      {dialog}
    </form>
  );
}
