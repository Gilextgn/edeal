import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV !== "production";
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// La lecture d'IMEI par reconnaissance de texte charge ses fichiers d'ici.
const ocr = "https://cdn.jsdelivr.net https://tessdata.projectnaptha.com";

// Politique de sécurité du contenu : le navigateur refuse tout ce qui ne
// vient pas de l'application elle-même, de Supabase ou des sources listées.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline' : scripts de démarrage de Next.js ; 'wasm-unsafe-eval' : lecture d'IMEI.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: ${ocr}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${supabase}`,
  "font-src 'self' data:",
  `connect-src 'self' data: ${supabase} ${supabase.replace(/^http/, "ws")} ${ocr}`,
  `worker-src 'self' blob: ${ocr}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Interdit d'afficher l'application dans le cadre d'un autre site.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Seul l'appareil photo est utile à l'application.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  // Force le HTTPS une fois le site en ligne (sans effet en local).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
