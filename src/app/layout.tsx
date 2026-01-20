import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { AuthProvider } from "@/lib/auth/auth-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
    <html lang="es" className="lenis">
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Skip link for keyboard/screen reader users */}
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        <AuthProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </AuthProvider>
      </body>
    </html>
  );
}
