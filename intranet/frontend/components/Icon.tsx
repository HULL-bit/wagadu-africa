import type { ReactNode } from "react";

/** Jeu d'icônes ligne (dérivé de Lucide, MIT) — remplace les emojis dans l'UI interne. */
const PATHS: Record<string, ReactNode> = {
  home: <><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" /></>,
  grid: <><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></>,
  check: <><path d="M21 7 9 19l-5.5-5.5" /></>,
  "check-square": <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="m9 12 2 2 4-4" /></>,
  calendar: <><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></>,
  palm: <><path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2c0-1.66 1.57-3 3.5-3S11 6.34 11 8Z" /><path d="M13 8c0-2.76 2.46-5 5.5-5S24 5.24 24 8h-2c0-1.66-1.57-3-3.5-3S15 6.34 15 8Z" /><path d="M13 8V3" /><path d="M12 21a4 4 0 0 1-4-4c0-2 1-4 4-9 3 5 4 7 4 9a4 4 0 0 1-4 4Z" /></>,
  "file-text": <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v5h5M9 13h6M9 17h6" /></>,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5 5 3 12v7a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-7L19 5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1Z" /></>,
  download: <><path d="M12 3v12" /><path d="m7 12 5 5 5-5" /><path d="M5 21h14" /></>,
  kanban: <><path d="M6 5v11M12 5v6M18 5v14" /><rect width="18" height="18" x="3" y="3" rx="2" /></>,
  mail: <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
  folder: <><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></>,
  video: <><path d="m16 13 5.2 3.1a1 1 0 0 0 1.5-.9V8.8a1 1 0 0 0-1.5-.9L16 11" /><rect width="14" height="12" x="2" y="6" rx="2" /></>,
  chat: <><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></>,
  "bar-chart": <><path d="M3 3v18h18" /><path d="M18 17V9M13 17V5M8 17v-3" /></>,
  "trending-up": <><path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>,
  star: <><path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.8l1.1-6.5L2.6 9.7l6.5-.9Z" /></>,
  award: <><circle cx="12" cy="8" r="5" /><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5" /></>,
  contact: <><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M7 18a5 5 0 0 1 10 0" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  receipt: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
  key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.5 12.5 8-8" /><path d="m16 5 3 3M18 3l3 3" /></>,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></>,
  megaphone: <><path d="m3 11 15-5v12L3 13Z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /><path d="M18 8a3 3 0 0 1 0 6" /></>,
  route: <><circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" /><path d="M9 19h5a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h5" /></>,
  archive: <><rect width="20" height="5" x="2" y="4" rx="1" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M10 13h4" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  vote: <><path d="m9 12 2 2 4-4" /><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v3H5Z" /><path d="M22 19H2l1.5-9h17Z" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  x: <><path d="M18 6 6 18M6 6l12 12" /></>,
  "chevron-left": <><path d="m15 18-6-6 6-6" /></>,
  pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" /><path d="M10 11v6M14 11v6" /></>,
  pin: <><path d="M12 17v5" /><path d="M9 10.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6.5l2 3.5H7Z" /></>,
  phone: <><path d="M13.8 20.7a15 15 0 0 1-6.5-3.9 15 15 0 0 1-4-6.6 2 2 0 0 1 1.3-2.5l2-.6a2 2 0 0 1 2.3 1.2l.8 2a2 2 0 0 1-.5 2.3l-.8.7a12 12 0 0 0 4.4 4.4l.7-.8a2 2 0 0 1 2.3-.5l2 .8a2 2 0 0 1 1.2 2.3l-.6 2a2 2 0 0 1-2.3 1.4Z" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" /></>,
  linkedin: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 17v-7" /></>,
  twitter: <><path d="M4 4l7.5 10L4 20h2l6.3-6.3L17 20h4l-8-11 7-7h-2l-5.8 5.8L9 4Z" /></>,
  facebook: <><path d="M14 8h2V5h-2a3 3 0 0 0-3 3v2H9v3h2v7h3v-7h2.5l.5-3H14V8.5a.5.5 0 0 1 .5-.5Z" /></>,
  "message-circle": <><path d="M7.5 19.5A9 9 0 1 0 4.5 16L3 21Z" /></>,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "w-5 h-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
