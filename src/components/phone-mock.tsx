import type { ReactNode } from "react";

// Téléphone dessiné en CSS pour l'écran de connexion : aucune image à charger.
// « island » évoque un iPhone récent, « punch » un Samsung Galaxy (caméra en
// poinçon, bords arrondis), « classic » un modèle à bordures.
export function PhoneMock({
  variant,
  className = "",
  children,
}: {
  variant: "island" | "punch" | "classic";
  className?: string;
  children: ReactNode;
}) {
  const frame = {
    island: "rounded-[2.4rem] border-[7px]",
    punch: "rounded-[1.9rem] border-x-[4px] border-y-[6px]",
    classic: "rounded-[1.6rem] border-x-[6px] border-y-[26px]",
  }[variant];
  const screen = {
    island: "rounded-[1.9rem]",
    punch: "rounded-[1.6rem]",
    classic: "rounded-md",
  }[variant];

  return (
    <div
      aria-hidden
      className={`relative aspect-[9/19] border-device bg-device shadow-[0_30px_60px_-20px_rgb(0_0_0/0.7)] ${frame} ${className}`}
    >
      <div className={`relative size-full overflow-hidden bg-surface text-fg ${screen}`}>
        {variant === "island" ? (
          <span className="absolute left-1/2 top-2 z-10 h-[7%] w-[34%] -translate-x-1/2 rounded-full bg-device" />
        ) : null}
        {variant === "punch" ? (
          <span className="absolute left-1/2 top-2.5 z-10 size-[5%] min-h-2 min-w-2 -translate-x-1/2 rounded-full bg-device" />
        ) : null}
        <div className="flex size-full flex-col gap-2 p-3 pt-[18%]">{children}</div>
        {/* Reflet qui traverse l'écran. */}
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent animate-[screen-shine_7s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

// Petits blocs d'interface factice affichés dans les écrans.
export function MockLine({ width = "w-full", tone = "bg-surface-2" }: { width?: string; tone?: string }) {
  return <span className={`block h-2 rounded-full ${tone} ${width}`} />;
}

export function MockCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-2.5 shadow-card">
      {children}
    </div>
  );
}
