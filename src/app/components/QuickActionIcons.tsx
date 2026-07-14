/** Purple line icons for Home → Quick actions (match reference design) */

const stroke = "#5B4FCF";

export function IconElevator({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="3" width="7" height="18" rx="1.5" stroke={stroke} strokeWidth="1.75" />
      <rect x="13" y="3" width="7" height="18" rx="1.5" stroke={stroke} strokeWidth="1.75" />
      <line x1="16.5" y1="3" x2="16.5" y2="21" stroke={stroke} strokeWidth="1.25" opacity="0.5" />
      <path d="M20.5 9v6M20.5 9l1.25-1.25M20.5 9l-1.25-1.25M20.5 15l1.25 1.25M20.5 15l-1.25 1.25" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconReport({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4.5L20.5 19.5H3.5L12 4.5Z" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M12 10v4" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.9" fill={stroke} />
    </svg>
  );
}

export function IconRoute({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5.5 18.5L17.5 6.5" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M11 6.5h6.5v6.5" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSaved({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.25l2.35 4.76 5.25.76-3.8 3.71.9 5.23L12 16.48l-4.7 2.23.9-5.23-3.8-3.71 5.25-.76L12 4.25Z"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}
