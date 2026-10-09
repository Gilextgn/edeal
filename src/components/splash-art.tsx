// Illustration à plat de l'écran d'ouverture : un vendeur qui tient un
// téléphone, à côté de boîtes empilées, sur une grande forme arrondie.
// Les couleurs viennent des tokens (classes `fill-*`) ; purement décoratif.
// Conçue pour un fond `primary` ; `className` règle sa taille et sa place.
export function SplashArt({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 360 300" className={className} aria-hidden>
      {/* Sol : grand disque clair qui dépasse du bas de l'écran. */}
      <ellipse cx="180" cy="330" rx="250" ry="170" className="fill-on-primary/20" />

      {/* Boîtes empilées, à gauche. */}
      <rect x="48" y="212" width="74" height="62" rx="8" className="fill-on-primary" />
      <rect x="60" y="164" width="56" height="50" rx="8" className="fill-on-primary/80" />
      <rect x="76" y="230" width="18" height="26" rx="5" className="fill-primary" />
      <rect x="80" y="180" width="16" height="20" rx="4" className="fill-primary" />

      {/* Vendeur : jambes, buste, tête. */}
      <rect x="170" y="238" width="22" height="62" rx="9" className="fill-brand" />
      <rect x="200" y="238" width="22" height="62" rx="9" className="fill-brand" />
      <path
        d="M152 170c0-22 18-38 44-38s44 16 44 38v74c0 6-5 10-10 10h-68c-5 0-10-4-10-10z"
        className="fill-brand"
      />
      <circle cx="196" cy="98" r="30" className="fill-tint-2" />
      <path d="M166 92c2-22 16-34 32-34 18 0 30 12 30 30-18 4-40 2-62 4z" className="fill-brand" />
      {/* Sourire. */}
      <path
        d="M186 106q10 9 20 0"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-brand"
      />

      {/* Bras tendu et téléphone, à droite. */}
      <path
        d="M236 168l44-22"
        fill="none"
        strokeWidth="18"
        strokeLinecap="round"
        className="stroke-brand"
      />
      <circle cx="284" cy="144" r="11" className="fill-tint-2" />
      <rect x="272" y="76" width="46" height="84" rx="11" className="fill-on-primary" />
      <rect x="279" y="86" width="32" height="56" rx="5" className="fill-primary" />
      <circle cx="295" cy="150" r="3.5" className="fill-primary" />
      {/* Coche sur l'écran : vendu. */}
      <path
        d="M286 114l7 7 12-14"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-on-primary"
      />
    </svg>
  );
}
