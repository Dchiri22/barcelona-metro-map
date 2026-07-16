import solmoveLogo from "@/imports/icons/solmove-logo-white.png";

/** SolMove logo — white PNG with real transparency (no black flash) */

type SolMoveLogoProps = {
  height?: number;
  className?: string;
};

export function SolMoveLogo({ height = 32, className = "" }: SolMoveLogoProps) {
  return (
    <img
      src={solmoveLogo}
      alt="SolMove"
      className={className}
      decoding="async"
      style={{
        height,
        width: "auto",
        maxWidth: "100%",
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
        background: "transparent",
      }}
    />
  );
}
