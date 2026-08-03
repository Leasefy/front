'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/use-auth';
import { getUserHomeRoute } from '@/lib/auth/role-routes';

const links = [
  { href: '/pricing', label: 'Precios' },
  { href: '/propiedades', label: 'Propiedades' },
  { href: '/pricing#faq', label: 'Ayuda' },
  { href: '/terminos', label: 'Términos' },
  { href: '/privacidad', label: 'Privacidad' },
];

const socialLinks = [
  {
    name: 'X',
    href: 'https://x.com/leasefy',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: 'https://facebook.com/leasefy',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: 'https://instagram.com/leasefy',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
      </svg>
    ),
  },
];

/**
 * FooterCompact — small, self-contained, theme-aware footer.
 * One compact band: brand + key links + social + copyright.
 *
 * The brand link is CONTEXT-AWARE: it points to the logged-in user's home
 * (tenant → /inquilino, agency → /panel/inmobiliaria, etc.) instead of the
 * public landing "/", so clicking "Leasefy" inside the app doesn't dump an
 * authenticated user onto the marketing site (which read as being logged out).
 */
export function FooterCompact() {
  const { user, activeContext, agencyRole } = useAuth();
  const homeHref = getUserHomeRoute(user, activeContext, agencyRole);

  return (
    <footer className="border-t border-border bg-background">
      <div className="container-platform py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand — routes to the user's home (or "/" when logged out). */}
          <Link href={homeHref} className="flex items-center gap-2 text-foreground" aria-label="Leasefy - Inicio">
            {/* Official Leasefy roof mark */}
            <svg viewBox="236 338 656 334" className="h-5 w-auto" fill="currentColor" aria-hidden>
              <path d="M 273.42 654.00 C 253.50 654.00 241.70 632.00 252.44 615.22 L 395.05 392.18 C 410.55 367.94 436.64 354.00 465.41 354.00 L 548.44 354.00 C 580.41 354.00 609.25 372.63 622.48 401.74 L 670.47 507.31 C 677.69 523.18 693.52 533.34 710.95 533.34 L 787.02 533.34 C 817.45 533.34 844.88 551.56 856.70 579.60 L 875.18 623.43 C 881.59 638.63 870.43 655.46 853.94 655.46 L 748.04 655.46 C 720.80 655.46 696.12 639.45 685.02 614.56 L 628.70 488.25 C 621.56 472.24 605.68 461.93 588.15 461.93 L 521.06 461.93 C 505.90 461.93 491.80 469.67 483.66 482.46 L 396.45 619.58 C 382.95 640.80 359.54 653.66 334.39 653.66 L 273.42 654.00 Z" />
            </svg>
            <span className="font-heading font-semibold text-[15px] tracking-[-0.02em]">Leasefy</span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Social + copyright */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
            <p className="text-[13px] text-muted-foreground whitespace-nowrap">
              © {new Date().getFullYear()} Leasefy
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
