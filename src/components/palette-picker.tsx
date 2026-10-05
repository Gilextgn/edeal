"use client";

import { useTranslations } from "next-intl";
import { PALETTES, usePalette } from "@/lib/browser-store";

// Choix de la palette de couleurs : quatre pastilles, effet immédiat.
// `tone="brand"` : posé sur une photo ou un fond de marque (texte clair).
export function PalettePicker({ tone = "surface" }: { tone?: "surface" | "brand" }) {
  const t = useTranslations("palette");
  const [palette, choose] = usePalette();
  const ring = tone === "brand" ? "outline-on-brand" : "outline-fg";

  return (
    <div role="radiogroup" aria-label={t("label")} className="flex items-center gap-2">
      {PALETTES.map(({ id, swatch }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={palette === id}
          aria-label={t(id)}
          title={t(id)}
          onClick={() => choose(id)}
          className={`inline-flex size-11 items-center justify-center rounded-full outline-offset-2 focus-visible:outline-2 ${ring}`}
        >
          {/* Couleurs fixes : la pastille montre la palette, quelle que soit celle en cours. */}
          <span
            className={`size-7 rounded-full border-2 border-surface shadow-card ${palette === id ? `outline-2 outline-offset-2 ${ring}` : ""}`}
            style={{
              background: `linear-gradient(135deg, ${swatch[0]} 0 50%, ${swatch[1]} 50% 100%)`,
            }}
          />
        </button>
      ))}
    </div>
  );
}
