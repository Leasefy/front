import type { Metadata } from "next";
import { Manrope, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { WishlistProvider } from "@/lib/stores/wishlist";
import { RouteAnnouncer } from "@/components/layout/RouteAnnouncer";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/JsonLd";

const manrope = Manrope({
  variable: "--font-heading",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Leasefy - Plataforma de arriendos en Colombia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Leasefy - Marketplace de Arriendos en Colombia",
    description:
      "Plataforma de arriendos con scoring de riesgo AI. Contratos digitales y pagos automatizados.",
    images: ["/og-image.jpg"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="lenis" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#5B5FEF" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <OrganizationJsonLd />
        <WebsiteJsonLd />
      </head>
      <body className={`${manrope.variable} ${dmSans.variable} ${dmMono.variable} font-sans antialiased`}>
        {/* Skip link for keyboard/screen reader users */}
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        <ThemeProvider>
          <AuthProvider>
            <WishlistProvider>
              <RouteAnnouncer />
              <SmoothScroll>{children}</SmoothScroll>
            </WishlistProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
