import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomInt, randomUUID } from "node:crypto";
import { imeiCheckDigit } from "../../src/domain/imei";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Variables Supabase absentes : lancez `npm run db:start` et remplissez .env.local.",
  );
}

// Les tests passent par la clé publique, comme l'application : ils
// vérifient ce qu'un vrai utilisateur peut lire ou écrire.
export function anonClient(): SupabaseClient {
  return createClient(url!, key!, { auth: { persistSession: false } });
}

export const TEST_PASSWORD = "motdepasse-de-test";

export function randomEmail() {
  return `test-${randomUUID()}@exemple.test`;
}

export function randomPhone() {
  return `+22990${randomInt(100000, 999999)}`;
}

export function randomImei() {
  const body = Array.from({ length: 14 }, () => randomInt(0, 10)).join("");
  return body + imeiCheckDigit(body);
}

type Credentials = { email: string } | { phone: string };

export type TestUser = { client: SupabaseClient; id: string };

export async function signUpUser(
  name: string,
  credentials: Credentials,
): Promise<TestUser> {
  const client = anonClient();
  const { data, error } = await client.auth.signUp({
    ...credentials,
    password: TEST_PASSWORD,
    options: { data: { name } },
  });
  if (error || !data.user || !data.session) {
    throw new Error(`Inscription de test impossible : ${error?.message}`);
  }
  return { client, id: data.user.id };
}

export async function createShop(client: SupabaseClient, name: string) {
  const { data, error } = await client.rpc("create_shop", { p_name: name });
  if (error) throw new Error(`create_shop : ${error.message}`);
  return data as string;
}

// Un patron avec sa boutique, un dealer (25 %) et un caissier déjà membres.
export async function shopWithTeam() {
  const dealerPhone = randomPhone();
  const cashierEmail = randomEmail();
  const patron = await signUpUser("Patron", { email: randomEmail() });
  const dealer = await signUpUser("Dealer", { phone: dealerPhone });
  const cashier = await signUpUser("Caissier", { email: cashierEmail });
  const shopId = await createShop(patron.client, "Boutique A");

  const dealerAdded = await patron.client.rpc("add_member", {
    p_shop_id: shopId,
    p_role: "DEALER",
    p_commission_rate_bps: 2500,
    p_phone: dealerPhone,
  });
  const cashierAdded = await patron.client.rpc("add_member", {
    p_shop_id: shopId,
    p_role: "CASHIER",
    p_email: cashierEmail,
  });
  if (dealerAdded.error || cashierAdded.error) {
    throw new Error("Ajout des membres de test impossible");
  }

  return { patron, dealer, cashier, shopId, dealerPhone };
}

type DeviceOwner = { shop_id: string } | { owner_user_id: string };

export function deviceRow(
  owner: DeviceOwner,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...owner,
    imei: randomImei(),
    model: "iPhone 13",
    capacity: "128 Go",
    color: "Noir",
    purchase_price: 200000,
    target_price: 250000,
    ...overrides,
  };
}

export async function createDevice(user: TestUser, owner: DeviceOwner) {
  const { data, error } = await user.client
    .from("devices")
    .insert(deviceRow(owner))
    .select("id")
    .single();
  if (error) throw new Error(`Création d'appareil de test impossible : ${error.message}`);
  return data.id as string;
}

export const REQUIRED_ANGLES = ["FRONT", "BACK", "SCREEN_ON", "ABOUT"] as const;

export function reportPayload(deviceId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    device_id: deviceId,
    grade: "GOOD",
    screen_condition: "LIGHT_SCRATCHES",
    body_condition: "PERFECT",
    battery_health: 87,
    face_id_ok: true,
    cameras_ok: true,
    speakers_ok: true,
    charging_ok: true,
    past_repairs: ["BATTERY"],
    accessories: ["BOX", "CABLE"],
    icloud_unlocked: true,
    comment: "",
    ...overrides,
  };
}

// Envoie une petite image par angle et renvoie la description des photos
// attendue par les fonctions de création de constat.
export async function uploadPhotos(
  user: TestUser,
  deviceId: string,
  reportId: string,
  angles: readonly string[] = REQUIRED_ANGLES,
) {
  const photos = [];
  for (const angle of angles) {
    const id = randomUUID();
    const storage_key = `${deviceId}/${reportId}/${id}`;
    const { error } = await user.client.storage
      .from("photos")
      .upload(storage_key, new Blob(["image de test"], { type: "image/jpeg" }));
    if (error) throw new Error(`Envoi de photo de test impossible : ${error.message}`);
    photos.push({ id, storage_key, angle, taken_at: new Date().toISOString() });
  }
  return photos;
}

export async function createReport(user: TestUser, deviceId: string) {
  const report = reportPayload(deviceId);
  const photos = await uploadPhotos(user, deviceId, report.id);
  const { error } = await user.client.rpc("create_intake_report", {
    p_report: report,
    p_photos: photos,
  });
  if (error) throw new Error(`Constat de test impossible : ${error.message}`);
  return { report, photos };
}
