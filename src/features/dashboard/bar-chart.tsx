"use client";

import { useState } from "react";

export type BarPoint = {
  // Libellé court sous l'axe (« 5 oct. »).
  label: string;
  // Phrase complète pour l'infobulle et le tableau de données.
  detail: string;
  value: number;
};

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 52 };
const MAX_BAR = 24;

// Arrondit le haut de l'échelle à un nombre « propre » (1, 2 ou 5 × 10ⁿ).
function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  return (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * power;
}

// Histogramme d'une seule série (le titre de la carte dit ce qui est tracé,
// donc pas de légende). Une barre par jour ; survol ou focus = détail.
// Les valeurs sont aussi disponibles en tableau pour les lecteurs d'écran.
export function BarChart({
  points,
  divisor,
  caption,
}: {
  points: BarPoint[];
  // Nombre de plus petites unités dans une unité de la devise (1 pour le FCFA).
  divisor: number;
  caption: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  // Graduations abrégées : « 250 k », « 1,5 M ».
  const compact = new Intl.NumberFormat("fr-FR", { notation: "compact" });
  const formatTick = (value: number) => compact.format(value / divisor);
  const max = niceMax(Math.max(...points.map((p) => p.value)));
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / points.length;
  const bar = Math.min(MAX_BAR, band - 2);
  const ticks = [0, max / 2, max];
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;
  // Assez de place pour un libellé sur deux quand les jours sont nombreux.
  const labelEvery = points.length > 8 ? 2 : 1;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={caption}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-border"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              className="fill-muted text-[11px]"
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {points.map((point, index) => {
          const x = PAD.left + band * index + (band - bar) / 2;
          const top = y(point.value);
          const height = PAD.top + plotH - top;
          const radius = Math.min(4, height);
          return (
            <g key={index}>
              {/* Haut arrondi, base droite posée sur la ligne de zéro. */}
              {height > 0 ? (
                <path
                  d={`M${x},${top + height} V${top + radius} Q${x},${top} ${x + radius},${top} H${x + bar - radius} Q${x + bar},${top} ${x + bar},${top + radius} V${top + height} Z`}
                  className={active === null || active === index ? "fill-chart" : "fill-chart/40"}
                />
              ) : null}
              {index % labelEvery === 0 ? (
                <text
                  x={x + bar / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-muted text-[11px]"
                >
                  {point.label}
                </text>
              ) : null}
              {/* Zone de survol : toute la colonne, plus large que la barre. */}
              <rect
                x={PAD.left + band * index}
                y={PAD.top}
                width={band}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={point.detail}
                className="outline-none focus-visible:stroke-primary focus-visible:stroke-2"
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              />
            </g>
          );
        })}
      </svg>

      {active !== null ? (
        <p
          role="status"
          className="pointer-events-none absolute top-0 z-10 max-w-56 -translate-x-1/2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium shadow-card"
          style={{
            left: `clamp(7rem, ${((PAD.left + band * (active + 0.5)) / WIDTH) * 100}%, calc(100% - 7rem))`,
          }}
        >
          {points[active].detail}
        </p>
      ) : null}

      {/* Un tableau ne se laisse pas masquer lui-même : on masque son conteneur. */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <tbody>
            {points.map((point, index) => (
              <tr key={index}>
                <td>{point.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
