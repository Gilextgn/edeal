import { photoStorageKey } from "@/domain/condition-report";
import { createClient } from "@/lib/supabase/client";

// File d'attente des constats, gardée sur le téléphone (IndexedDB).
// Un constat y est déposé avant tout envoi, puis retiré une fois enregistré
// par le serveur. Si la connexion tombe, il reste là et repart plus tard.
// L'envoi est rejouable : les identifiants sont créés sur le téléphone.

const DB_NAME = "edeal-offline";
const STORE = "pending-reports";
export const QUEUE_CHANGED = "edeal:queue-changed";

export type PendingPhoto = { id: string; angle: string; taken_at: string; blob: Blob };

export type PendingReport = {
  id: string;
  userId: string;
  deviceId: string;
  // Champs du constat, tels qu'attendus par la fonction create_intake_report.
  report: Record<string, unknown>;
  photos: PendingPhoto[];
  createdAt: string;
  // Clé de messages/fr.json sous "sync.errors" quand le serveur a refusé.
  error?: string;
};

// Refus définitifs du serveur : réessayer ne servirait à rien.
const REJECTIONS = new Set([
  "not_allowed",
  "missing_photos",
  "photo_not_uploaded",
  "invalid_report",
]);

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

function notify() {
  window.dispatchEvent(new Event(QUEUE_CHANGED));
}

export async function enqueueReport(item: PendingReport) {
  await run("readwrite", (store) => store.put(item));
  notify();
}

export async function listPendingReports(userId: string): Promise<PendingReport[]> {
  const all = await run<PendingReport[]>("readonly", (store) => store.getAll());
  return all.filter((item) => item.userId === userId);
}

export async function discardReport(id: string) {
  await run("readwrite", (store) => store.delete(id));
  notify();
}

type Outcome = "sent" | "offline" | { rejected: string };

async function send(item: PendingReport): Promise<Outcome> {
  const supabase = createClient();
  const photos = [];

  for (const photo of item.photos) {
    const storage_key = photoStorageKey(item.deviceId, item.id, photo.id);
    const { error } = await supabase.storage
      .from("photos")
      .upload(storage_key, photo.blob, { contentType: "image/jpeg" });

    if (error) {
      const status = "status" in error ? Number(error.status) : null;
      const alreadySent =
        status === 409 || /already exists|duplicate/i.test(error.message);
      if (!alreadySent) {
        // Sans code HTTP, la requête n'est pas partie : pas de connexion.
        if (!status) return "offline";
        return { rejected: status === 403 || status === 400 ? "not_allowed" : "generic" };
      }
    }
    photos.push({ id: photo.id, angle: photo.angle, taken_at: photo.taken_at, storage_key });
  }

  const { error } = await supabase.rpc("create_intake_report", {
    p_report: { ...item.report, id: item.id, device_id: item.deviceId },
    p_photos: photos,
  });
  if (!error) return "sent";
  if (REJECTIONS.has(error.message)) return { rejected: error.message };
  // PostgREST renvoie un code pour toute réponse du serveur.
  return error.code ? { rejected: "generic" } : "offline";
}

let running: Promise<number> | null = null;

/** Envoie les constats en attente de cet utilisateur. Retourne le nombre envoyé. */
export function syncPendingReports(userId: string): Promise<number> {
  running ??= (async () => {
    let sent = 0;
    try {
      for (const item of await listPendingReports(userId)) {
        const outcome = await send(item);
        if (outcome === "offline") break;
        if (outcome === "sent") {
          await run("readwrite", (store) => store.delete(item.id));
          sent += 1;
        } else {
          await run("readwrite", (store) =>
            store.put({ ...item, error: outcome.rejected }),
          );
        }
      }
    } finally {
      running = null;
      notify();
    }
    return sent;
  })();
  return running;
}
