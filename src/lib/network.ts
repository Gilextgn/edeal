// Vrai quand une opération a échoué faute de joindre le serveur (connexion
// coupée, lente ou instable), et non parce que le serveur a répondu « non ».
// Sert à montrer un message compréhensible plutôt qu'une erreur technique.
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, message, cause } = error as { name?: string; message?: string; cause?: unknown };
  if (name === "AuthRetryableFetchError") return true;
  const code = (cause as { code?: string } | undefined)?.code ?? "";
  return /fetch failed|network|timed? ?out|ECONN|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|UND_ERR/i.test(
    `${message ?? ""} ${code}`,
  );
}

// Message d'une erreur levée quand le serveur est injoignable : la page
// d'erreur le reconnaît pour afficher l'explication adaptée. (En production,
// Next.js masque le message des erreurs serveur ; la page s'appuie alors
// aussi sur `navigator.onLine`.)
export const NETWORK_ERROR = "edeal:network";
