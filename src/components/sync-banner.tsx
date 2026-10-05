"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  discardReport,
  listPendingReports,
  QUEUE_CHANGED,
  syncPendingReports,
  type PendingReport,
} from "@/lib/offline/report-queue";
import { Button } from "./ui";

// Affiche les constats gardés sur le téléphone et relance leur envoi à
// l'ouverture de l'application et au retour de la connexion.
export function SyncBanner({ userId }: { userId: string }) {
  const t = useTranslations("sync");
  const router = useRouter();
  const [pending, setPending] = useState<PendingReport[]>([]);
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    try {
      setPending(await listPendingReports(userId));
    } catch {
      // IndexedDB indisponible (navigation privée) : rien à afficher.
    }
  }, [userId]);

  const sync = useCallback(async () => {
    try {
      const waiting = await listPendingReports(userId);
      setPending(waiting);
      if (waiting.length === 0) return;

      setSyncing(true);
      if ((await syncPendingReports(userId)).size > 0) router.refresh();
    } catch {
      // File illisible ou envoi interrompu : elle reste intacte, on peut réessayer.
    } finally {
      setSyncing(false);
    }
  }, [userId, router]);

  useEffect(() => {
    // Premier envoi juste après l'affichage, puis à chaque retour de connexion.
    const firstRun = setTimeout(sync, 0);
    window.addEventListener("online", sync);
    window.addEventListener(QUEUE_CHANGED, reload);
    return () => {
      clearTimeout(firstRun);
      window.removeEventListener("online", sync);
      window.removeEventListener(QUEUE_CHANGED, reload);
    };
  }, [sync, reload]);

  if (pending.length === 0) return null;
  const rejected = pending.filter((item) => item.error);

  return (
    <div
      role="status"
      className="mb-5 flex flex-col gap-3 rounded-2xl bg-warning-soft p-4 text-warning"
    >
      <div>
        <p className="font-semibold">{t("pending", { count: pending.length })}</p>
        <p className="text-sm">{syncing ? t("syncing") : t("pendingHint")}</p>
      </div>
      {rejected.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-danger">
            {t("failed", { reason: t(`errors.${item.error}`) })}
          </p>
          <Button variant="danger" onClick={() => discardReport(item.id)}>
            {t("discard")}
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        disabled={syncing}
        onClick={sync}
        className="w-full sm:w-auto sm:self-start"
      >
        {t("retry")}
      </Button>
    </div>
  );
}
