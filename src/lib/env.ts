import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
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
