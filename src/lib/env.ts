import { z } from "zod";

const schema = z.object({
  // L'adresse de l'API (https://<ref>.supabase.co), pas celle de la page du
  // tableau de bord : avec cette dernière, chaque appel reçoit une page HTML.
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine((url) => !url.includes("supabase.com/dashboard"), {
    message:
      "NEXT_PUBLIC_SUPABASE_URL doit être l'adresse de l'API (https://<ref>.supabase.co), pas celle du tableau de bord.",
  }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_DEFAULT_COUNTRY_CODE: z.string().regex(/^[1-9]\d{0,2}$/),
});

// Les variables NEXT_PUBLIC_* doivent être lues littéralement pour être
// incluses dans le code envoyé au navigateur.
export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_DEFAULT_COUNTRY_CODE:
    process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE,
});
