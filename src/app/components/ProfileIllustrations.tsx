/** Profile step illustrations — purple line art (Step 1 of 2) */

const S = "#2FA3A0";
const W = 2;
const cap = "round" as const;
const join = "round" as const;

type Props = { size?: number };

export function IconProfileWheelchair({ size = 56 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      {/* large rear wheel */}
      <circle cx="18" cy="38" r="11" stroke={S} strokeWidth={W} />
      <circle cx="18" cy="38" r="2" fill={S} />
      {/* small front wheel */}
      <circle cx="36" cy="42" r="4.5" stroke={S} strokeWidth={W} />
      {/* seat */}
      <path d="M20 28h14v5H20z" stroke={S} strokeWidth={W} strokeLinejoin={join} />
      {/* back rest */}
      <path d="M20 22v11" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      {/* footrest */}
      <path d="M34 33h6" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      {/* frame */}
      <path d="M18 27 L28 27 L34 33" stroke={S} strokeWidth={W} strokeLinecap={cap} strokeLinejoin={join} />
      {/* person */}
      <circle cx="26" cy="17" r="4" stroke={S} strokeWidth={W} />
      <path d="M26 21v4" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      <path d="M26 23h-4" stroke={S} strokeWidth={W} strokeLinecap={cap} />
    </svg>
  );
}

export function IconProfileCrutches({ size = 56 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      {/* left crutch */}
      <path d="M16 12v32" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      <path d="M12 12h8" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      <path d="M14 44h4" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      {/* right crutch */}
      <path d="M34 16v28" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      <path d="M30 16h8" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      <path d="M32 44h4" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      {/* slight cross at mid */}
      <path d="M18 26l14 6" stroke={S} strokeWidth={W} strokeLinecap={cap} opacity="0.85" />
    </svg>
  );
}

export function IconProfilePram({ size = 56 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      {/* hood / canopy */}
      <path d="M14 30 C14 18 24 12 34 12 L34 30 Z" stroke={S} strokeWidth={W} strokeLinejoin={join} />
      {/* body */}
      <path d="M14 30 H38 C38 38 32 44 26 44 C20 44 14 38 14 30 Z" stroke={S} strokeWidth={W} strokeLinejoin={join} />
      {/* handle */}
      <path d="M34 12 L44 12 L44 24" stroke={S} strokeWidth={W} strokeLinecap={cap} strokeLinejoin={join} />
      {/* wheels */}
      <circle cx="20" cy="48" r="4" stroke={S} strokeWidth={W} />
      <circle cx="34" cy="48" r="4" stroke={S} strokeWidth={W} />
      <path d="M20 44 H34" stroke={S} strokeWidth={W} strokeLinecap={cap} />
    </svg>
  );
}

export function IconProfileVisual({ size = 56 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      {/* rays from top */}
      <path d="M22 10 L24 16" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      <path d="M28 8 L28 14" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      <path d="M34 10 L32 16" stroke={S} strokeWidth={W} strokeLinecap={cap} />
      {/* eye outline */}
      <path
        d="M8 28 C14 18 22 14 28 14 C34 14 42 18 48 28 C42 38 34 42 28 42 C22 42 14 38 8 28 Z"
        stroke={S}
        strokeWidth={W}
        strokeLinejoin={join}
      />
      {/* iris + pupil */}
      <circle cx="28" cy="28" r="6.5" stroke={S} strokeWidth={W} />
      <circle cx="28" cy="28" r="2.5" fill={S} />
    </svg>
  );
}

export const PROFILE_ILLUSTRATIONS = {
  wheelchair: IconProfileWheelchair,
  crutches: IconProfileCrutches,
  pram: IconProfilePram,
  visual: IconProfileVisual,
} as const;
