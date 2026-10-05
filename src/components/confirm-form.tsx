"use client";

import type { ReactNode } from "react";

// Formulaire d'une action sans retour (supprimer, annuler) : demande une
// confirmation avant d'envoyer.
export function ConfirmForm({
  action,
  message,
  children,
}: {
  action: () => Promise<void>;
  message: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
