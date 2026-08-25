import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { WishlistProvider } from "@/lib/stores/wishlist";
import { RouteAnnouncer } from "@/components/layout/RouteAnnouncer";
import { PushNotificationHandler } from "@/components/notifications/PushNotificationHandler";
import { SessionRevocationHandler } from "@/components/auth/SessionRevocationHandler";
import { IdleSessionGuard } from "@/components/auth/IdleSessionGuard";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/JsonLd";
import { Toaster } from "@/components/ui/toast";

// Cadence: Schibsted Grotesk — Regular (cuerpo) + Semibold (títulos).
// Una sola familia para sans + heading; se mapea en globals.css.
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// JetBrains Mono — numerals / labels / tags / overlines (UPPERCASE)
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://leasefy.co';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Leasefy - Marketplace de Arriendos en Colombia",
    template: "%s | Leasefy",
  },
  description:
    "Plataforma de arriendos en Colombia con scoring de riesgo AI. Propietarios toman decisiones informadas sobre inquilinos en minutos. Contratos digitales, pagos automatizados y verificación de inquilinos.",
  keywords: [
    "arriendos Colombia",
    "alquiler apartamentos Bogota",
    "arrendar propiedad",
    "inquilinos verificados",
    "scoring inquilinos",
    "contratos arriendo digital",
    "pagos arriendo online",
    "marketplace arriendos",
    "propiedades en arriendo",
    "inmobiliaria digital Colombia",
  ],
  authors: [{ name: "Leasefy", url: siteUrl }],
  creator: "Leasefy",
  publisher: "Leasefy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: siteUrl,
    siteName: "Leasefy",
    title: "Leasefy - Marketplace de Arriendos en Colombia",
    description:
      "Plataforma de arriendos con scoring de riesgo AI. Propietarios toman decisiones informadas sobre inquilinos en minutos.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Leasefy - Marketplace de Arriendos en Colombia",
    description:
      "Plataforma de arriendos con scoring de riesgo AI. Contratos digitales y pagos automatizados.",
    creator: "@leasefy",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add these when you have the verification codes
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      "es-CO": siteUrl,
    },
  },
  category: "real estate",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1A40FF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`lenis ${schibsted.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <OrganizationJsonLd />
        <WebsiteJsonLd />
      </head>
      <body className="font-sans antialiased">
        {/* Skip link for keyboard/screen reader users */}
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        <ThemeProvider>
          <AuthProvider>
            <WishlistProvider>
              <RouteAnnouncer />
              <PushNotificationHandler />
              <SessionRevocationHandler />
              <IdleSessionGuard />
              <SmoothScroll>{children}</SmoothScroll>
            </WishlistProvider>
          </AuthProvider>
          {/* Toaster ÚNICO de toda la app (DESIGN.md §Toaster: position="top-right").
              Vive acá, fuera de AuthProvider y de todo guard, por dos razones:
              1. Antes se montaba sólo en 4 layouts (panel/inmobiliaria, panel/(landlord),
                 inquilino, onboarding), así que cada toast disparado desde el resto del
                 árbol — /auth/mfa-verify, /avaluo, /propiedades, la landing y el propio
                 auth-context — no pintaba nada: la llamada resolvía en silencio.
              2. En los paneles quedaba DENTRO de <ProtectedRoute>/<AgencySubscriptionGuard>,
                 así que todo toast emitido mientras el guard resuelve (o cuando el guard
                 no deja pasar) se perdía.
              Sonner pinta cada toast en TODOS los <Toaster> montados: debe haber uno solo.
              Si agregás otro en un layout, los toasts se duplican. */}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
