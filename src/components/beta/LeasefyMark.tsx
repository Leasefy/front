/**
 * LeasefyMark — the real Leasefy brand mark (the blue "swoosh" from
 * public/images/leasefy-logo.svg) as an inline SVG so it can inherit
 * `currentColor` and adapt to light/dark surfaces (white-on-dark like the
 * brand guideline, brand blue #1A40FF on light).
 *
 * The path is wide (~2:1) — size it with a width class + `h-auto`
 * (e.g. `className="w-6 h-auto"`).
 */
export function LeasefyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="236 338 656 334"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M 273.42 654.00 C 253.50 654.00 241.70 632.00 252.44 615.22 L 395.05 392.18 C 410.55 367.94 436.64 354.00 465.41 354.00 L 548.44 354.00 C 580.41 354.00 609.25 372.63 622.48 401.74 L 670.47 507.31 C 677.69 523.18 693.52 533.34 710.95 533.34 L 787.02 533.34 C 817.45 533.34 844.88 551.56 856.70 579.60 L 875.18 623.43 C 881.59 638.63 870.43 655.46 853.94 655.46 L 748.04 655.46 C 720.80 655.46 696.12 639.45 685.02 614.56 L 628.70 488.25 C 621.56 472.24 605.68 461.93 588.15 461.93 L 521.06 461.93 C 505.90 461.93 491.80 469.67 483.66 482.46 L 396.45 619.58 C 382.95 640.80 359.54 653.66 334.39 653.66 L 273.42 654.00 Z"
      />
    </svg>
  );
}
