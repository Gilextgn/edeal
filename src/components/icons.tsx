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
  phone: (
    <Icon>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </Icon>
  ),
  chevron: (
    <Icon>
      <path d="m9 5 7 7-7 7" />
    </Icon>
  ),
  plus: (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
};

export type IconName = keyof typeof icons;
