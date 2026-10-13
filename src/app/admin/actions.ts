"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { percentInputToBps } from "@/domain/commission";
import { parseIdentifier } from "@/domain/identifier";
import { passwordIssues } from "@/domain/password";
import { temporaryPassword } from "@/domain/temp-password";
import { whatsappUrl } from "@/domain/whatsapp";
import { env } from "@/lib/env";
import { requireSuperadmin } from "@/lib/superadmin";

// Actions du superadmin. Chacune revérifie le rôle : une Server Action est
// appelable directement, sans passer par l'écran.

// Suspendre un compte : la personne ne peut plus se connecter (ses sessions
// en cours expirent sous une heure). Rien n'est effacé.
const SUSPENDED_FOR = "876000h"; // environ 100 ans

export async function setUserSuspended(userId: string, suspended: boolean) {
  const { userId: me, admin } = await requireSuperadmin();
  // On ne se bloque pas soi-même hors de la plateforme.
  if (userId === me) redirect(`/admin/users/${userId}?notice=self`);

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: suspended ? SUSPENDED_FOR : "none",
  });
  revalidatePath("/admin", "layout");
  redirect(`/admin/users/${userId}?notice=${error ? "failed" : suspended ? "suspended" : "restored"}`);
}

// Suspendre une boutique : plus aucun membre n'y a accès (voir la migration
// platform_admin) ; tout est conservé et revient à la réactivation.
export async function setShopSuspended(shopId: string, suspended: boolean) {
  const { admin } = await requireSuperadmin();
  const { error } = await admin
    .from("shops")
    .update({ suspended_at: suspended ? new Date().toISOString() : null })
    .eq("id", shopId);
  revalidatePath("/admin", "layout");
  redirect(`/admin/shops/${shopId}?notice=${error ? "failed" : suspended ? "suspended" : "restored"}`);
}

// ---------- Création d'un compte par le superadmin ----------

export type CreateAccountState = {
  error?: string;
  values?: Record<string, string>;
  // Une fois le compte créé : ce qu'il faut transmettre à la personne. Le mot
  // de passe provisoire n'est montré qu'ici, une seule fois.
  done?: {
    userId: string;
    name: string;
    identifier: string;
    password: string;
    message: string;
    whatsapp: string | null;
    mailto: string | null;
  };
} | null;

const ACCESS = ["none", "owner", "member"] as const;
const MEMBER_ROLES = ["DEALER", "CASHIER"] as const;

// Crée un compte prêt à l'emploi : identifiant tenu pour confirmé, mot de
// passe provisoire à changer à la première connexion, et au choix une
// boutique dont la personne est patron, ou une place dans une boutique.
export async function createAccount(
  _previous: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const { admin } = await requireSuperadmin();
  const t = await getTranslations();
  const values = Object.fromEntries(
    ["name", "identifier", "access", "shopName", "shopId", "role", "rate"].map((key) => [
      key,
      String(formData.get(key) ?? "").trim(),
    ]),
  );
  const fail = (error: string): CreateAccountState => ({ error, values });

  if (!values.name || values.name.length > 80) return fail("auth.errors.nameRequired");
  const identifier = parseIdentifier(values.identifier, env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE);
  if (!identifier) return fail("auth.errors.identifierInvalid");
  const access = ACCESS.find((a) => a === values.access) ?? "none";
  const role = MEMBER_ROLES.find((r) => r === values.role);
  if (access === "owner" && (!values.shopName || values.shopName.length > 60)) {
    return fail("admin.errors.shopNameRequired");
  }
  if (access === "member" && (!values.shopId || !role)) return fail("admin.errors.shopRequired");
  const rateBps = access === "member" && role === "DEALER" ? percentInputToBps(values.rate) : 0;
  if (rateBps === null) return fail("errors.invalid_rate");

  const login = identifier.kind === "email" ? identifier.email : identifier.phone;
  let password = temporaryPassword();
  while (passwordIssues(password, login).length > 0) password = temporaryPassword();

  const created = await admin.auth.admin.createUser({
    ...(identifier.kind === "email"
      ? { email: identifier.email, email_confirm: true }
      : { phone: identifier.phone, phone_confirm: true }),
    password,
    user_metadata: { name: values.name, must_change_password: true },
  });
  if (created.error || !created.data.user) {
    const taken = ["email_exists", "phone_exists", "user_already_exists"].includes(created.error?.code ?? "");
    console.error("createAccount :", created.error?.code, created.error?.message);
    return fail(taken ? "auth.errors.alreadyRegistered" : "errors.generic");
  }
  const userId = created.data.user.id;

  // La boutique ou la place dans une boutique. Le compte existe déjà : en cas
  // d'échec ici, on le dit, et le superadmin complète depuis la fiche.
  if (access === "owner") {
    const shop = await admin.from("shops").insert({ name: values.shopName }).select("id").single();
    const owner = shop.data
      ? await admin.from("memberships").insert({ shop_id: shop.data.id, user_id: userId, role: "OWNER" })
      : null;
    if (!shop.data || owner?.error) return fail("admin.errors.accessFailed");
  } else if (access === "member" && role) {
    const member = await admin
      .from("memberships")
      .insert({ shop_id: values.shopId, user_id: userId, role, commission_rate_bps: rateBps });
    // Déjà membre grâce à une invitation en attente : rien à faire.
    if (member.error && member.error.code !== "23505") return fail("admin.errors.accessFailed");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const shown = identifier.kind === "email" ? identifier.email : identifier.phone;
  const message = t("admin.accessMessage", {
    name: values.name.split(/\s+/)[0],
    url: `${protocol}://${host}/login`,
    identifier: shown,
    password,
  });

  revalidatePath("/admin", "layout");
  return {
    done: {
      userId,
      name: values.name,
      identifier: shown,
      password,
      message,
      whatsapp:
        identifier.kind === "phone"
          ? whatsappUrl(message, identifier.phone, env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE)
          : null,
      mailto:
        identifier.kind === "email"
          ? `mailto:${identifier.email}?subject=${encodeURIComponent(t("admin.accessSubject"))}&body=${encodeURIComponent(message)}`
          : null,
    },
  };
}
