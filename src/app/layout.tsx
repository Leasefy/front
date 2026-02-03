import type { Metadata } from "next";
import { Manrope, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arriendofacil.co';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Arriendo Facil - Marketplace de Arriendos en Colombia",
    template: "%s | Arriendo Facil",
  },
  description:
    "Plataforma de arriendos en Colombia con scoring de riesgo AI. Propietarios toman decisiones informadas sobre inquilinos en minutos. Contratos digitales, pagos automatizados y verificacion de inquilinos.",
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
  authors: [{ name: "Arriendo Facil", url: siteUrl }],
  creator: "Arriendo Facil",
  publisher: "Arriendo Facil",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: siteUrl,
    siteName: "Arriendo Facil",
    title: "Arriendo Facil - Marketplace de Arriendos en Colombia",
    description:
      "Plataforma de arriendos con scoring de riesgo AI. Propietarios toman decisiones informadas sobre inquilinos en minutos.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Arriendo Facil - Plataforma de arriendos en Colombia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arriendo Facil - Marketplace de Arriendos en Colombia",
    description:
      "Plataforma de arriendos con scoring de riesgo AI. Contratos digitales y pagos automatizados.",
    images: ["/og-image.jpg"],
    creator: "@arriendofacil",
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
            <RouteAnnouncer />
            <SmoothScroll>{children}</SmoothScroll>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
