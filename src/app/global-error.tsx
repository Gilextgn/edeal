"use client";

import { ErrorScreen } from "@/components/error-screen";
import messages from "../../messages/fr.json";
import "./globals.css";

// Dernier recours, quand même la mise en page générale n'a pas pu s'afficher.
// Elle remplace tout le document : pas d'accès aux traductions chargées par
// le layout, d'où la lecture directe du fichier de textes.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body className="min-h-dvh bg-bg font-sans text-fg">
        <title>{messages.app.name}</title>
        <ErrorScreen error={error} retry={retry} texts={messages.errorPage} />
      </body>
    </html>
  );
}
