import type { ReactNode, SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

export const icons = {
  home: (
    <Icon>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </Icon>
  ),
  phone: (
    <Icon>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </Icon>
  ),
  consign: (
    <Icon>
      <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
    </Icon>
  ),
  sales: (
    <Icon>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </Icon>
  ),
  wallet: (
    <Icon>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <rect x="4" y="8" width="16.5" height="11" rx="2.5" />
      <circle cx="16" cy="13.5" r="1.2" />
    </Icon>
  ),
  customers: (
    <Icon>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M5.8 16.5c.5-1.6 1.7-2.5 3.2-2.5s2.7.9 3.2 2.5M15 9.5h3M15 13h3" />
    </Icon>
  ),
  members: (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.7 2.5 3 5.2" />
    </Icon>
  ),
  settings: (
    <Icon>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </Icon>
  ),
  spaces: (
    <Icon>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </Icon>
  ),
  account: (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.5c.8-4 4-6 8-6s7.2 2 8 6" />
    </Icon>
  ),
  chevron: (
    <Icon>
      <path d="m9 5 7 7-7 7" />
    </Icon>
  ),
  chevronLeft: (
    <Icon>
      <path d="m15 5-7 7 7 7" />
    </Icon>
  ),
  chevronDown: (
    <Icon width="16" height="16">
      <path d="m5 9 7 7 7-7" />
    </Icon>
  ),
  plus: (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  more: (
    <Icon>
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="19" cy="12" r="1.3" />
    </Icon>
  ),
  menu: (
    <Icon>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </Icon>
  ),
  close: (
    <Icon>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  ),
  search: (
    <Icon width="18" height="18">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Icon>
  ),
  moon: (
    <Icon>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
    </Icon>
  ),
  sun: (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </Icon>
  ),
  bell: (
    <Icon>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 21h4" />
    </Icon>
  ),
  logout: (
    <Icon>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8 6 12l4 4M6 12h10" />
    </Icon>
  ),
  eye: (
    <Icon width="18" height="18">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </Icon>
  ),
  pencil: (
    <Icon width="18" height="18">
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="m14.5 7.5 3 3" />
    </Icon>
  ),
  trash: (
    <Icon width="18" height="18">
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />
    </Icon>
  ),
  camera: (
    <Icon>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2.5h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.3" />
    </Icon>
  ),
  upload: (
    <Icon>
      <path d="M12 16V4.5M7.5 9 12 4.5 16.5 9M5 15.5V19h14v-3.5" />
    </Icon>
  ),
  check: (
    <Icon>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  ),
  trend: (
    <Icon>
      <path d="M3.5 17 9 11.5l4 4L20.5 8" />
      <path d="M15 8h5.5v5.5" />
    </Icon>
  ),
  coins: (
    <Icon>
      <ellipse cx="9" cy="8" rx="5.5" ry="3" />
      <path d="M3.5 8v4c0 1.7 2.5 3 5.5 3M3.5 12v4c0 1.7 2.5 3 5.5 3" />
      <ellipse cx="15.5" cy="14.5" rx="5" ry="2.8" />
      <path d="M10.5 14.5v3c0 1.5 2.2 2.8 5 2.800s5-1.3 5-2.800v-3" />
    </Icon>
  ),
  box: (
    <Icon>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.500z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </Icon>
  ),
  alert: (
    <Icon>
      <path d="M12 4 2.5 20h19z" />
      <path d="M12 10v4.5M12 17.300v.2" />
    </Icon>
  ),
};

export type IconName = keyof typeof icons;
