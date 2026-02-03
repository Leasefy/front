import type { Metadata } from "next";
import { Manrope, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { RouteAnnouncer } from "@/components/layout/RouteAnnouncer";

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

export const metadata: Metadata = {
  title: "Arriendo Facil - Marketplace de Arriendos",
  description:
    "Plataforma de arriendos en Colombia con scoring de riesgo AI. Propietarios toman decisiones informadas sobre inquilinos en minutos.",
  keywords: ["arriendos", "Colombia", "alquiler", "propiedades", "scoring"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="lenis" suppressHydrationWarning>
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
