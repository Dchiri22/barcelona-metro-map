/** SolMove brand palette */
export const SOLMOVE = {
  sun: "#F5B12E",
  path: "#2FA3A0",
  ink: "#24323F",
  gray: "#E6E8EB",
  bg: "#F7F8F9",
  white: "#ffffff",
  muted: "#5A6875",
  border: "rgba(36,50,63,0.14)",
  shadow: "rgba(47,163,160,0.14)",
  shadowSm: "rgba(47,163,160,0.10)",
} as const;

export const APP_THEME = {
  bg: SOLMOVE.bg,
  white: SOLMOVE.white,
  ink: SOLMOVE.ink,
  accent: SOLMOVE.path,
  signal: SOLMOVE.sun,
  muted: SOLMOVE.muted,
  border: SOLMOVE.border,
  shadow: `0 4px 24px ${SOLMOVE.shadow}`,
  shadowSm: `0 2px 12px ${SOLMOVE.shadowSm}`,
  display: "'Bricolage Grotesque', sans-serif",
  body: "'Onest', sans-serif",
} as const;

export const ELEV_STATUS_COLOR: Record<"ok" | "maint" | "down" | "none", string> = {
  ok: SOLMOVE.path,
  maint: SOLMOVE.sun,
  down: SOLMOVE.ink,
  none: "#9CA3AF",
};
