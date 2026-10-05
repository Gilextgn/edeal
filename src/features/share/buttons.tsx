"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui";

export function PrintButton({ children }: { children: ReactNode }) {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      {children}
    </Button>
  );
}

export function CopyButton({
  text,
  label,
  copiedLabel,
}: {
  text: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          // Presse-papiers refusé : le texte reste sélectionnable à l'écran.
        }
      }}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}

// Partage le texte et les photos vers une autre application (WhatsApp,
// Facebook…) quand le téléphone le permet. Absent sinon.
export function SharePhotosButton({
  text,
  photos,
  children,
}: {
  text: string;
  photos: { url: string; name: string }[];
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  // Connu seulement dans le navigateur : rien n'est rendu côté serveur.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === "function",
    () => false,
  );
  if (!canShare) return null;

  return (
    <Button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const files = await Promise.all(
            photos.map(async (photo) => {
              const blob = await (await fetch(photo.url)).blob();
              return new File([blob], `${photo.name}.jpg`, { type: "image/jpeg" });
            }),
          );
          const withFiles = { text, files };
          await navigator.share(navigator.canShare?.(withFiles) ? withFiles : { text });
        } catch {
          // Partage annulé par l'utilisateur, ou photos inaccessibles.
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
    </Button>
  );
}
