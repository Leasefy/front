import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { IntroSection } from "@/components/home/IntroSection";
import { ProblemSection } from "@/components/home/ProblemSection";
import { AboutSection } from "@/components/home/AboutSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { PropertiesSection } from "@/components/home/PropertiesSection";
import { CTASection } from "@/components/home/CTASection";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://leasefy.co';

export const metadata: Metadata = {
  title: "Leasefy — Arrienda sin estrés | Administración de arriendos en Colombia",
  description:
    "Plataforma integral de administración de arriendos en Colombia. Verificación de inquilinos con scoring AI, contratos digitales, cobro automatizado de arriendos y gestión completa de propiedades. Simplifica tu arriendo desde el primer día.",
  openGraph: {
    title: "Leasefy — Arrienda sin estrés | Administración de arriendos en Colombia",
    description:
      "Administra tus arriendos sin estrés. Verificación de inquilinos, contratos digitales, cobros automáticos y gestión completa de propiedades en Colombia.",
    url: siteUrl,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Leasefy — Administración de arriendos en Colombia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Leasefy — Arrienda sin estrés | Administración de arriendos en Colombia",
    description:
      "Plataforma de administración de arriendos en Colombia. Scoring AI de inquilinos, contratos digitales y cobro automatizado.",
    images: ["/og-image.jpg"],
    creator: "@leasefy",
  },
  keywords: [
    "administración de arriendos Colombia",
    "gestión de arriendos",
    "verificación de inquilinos",
    "scoring inquilinos Colombia",
    "contratos de arriendo digitales",
    "cobro de arriendos online",
    "plataforma arriendos Colombia",
    "arrendar propiedad Bogotá",
    "software inmobiliario Colombia",
    "administración inmuebles arriendo",
  ],
  alternates: {
    canonical: siteUrl,
  },
};

/**
 * Landing Page - Conversion Structure
 *
 * 1. Hero - Transformation focused
 * 2. Intro - Value proposition & audiences
 * 3. Problem - Pain points of traditional renting
 * 4. Solution - Outcomes (AboutSection)
 * 5. Social Proof - Testimonials with results
 * 6. How It Works - 3 clear steps
 * 7. Properties - Show real listings
 * 8. Final CTA - Conversion
 */
export default function House() {
  return (
    <ForceLightMode>
      <Navbar />
      <main id="main-content">
        {/* 1. Hero - Transformation */}
        <HeroSection />

        {/* 2. Intro - Value proposition */}
        <IntroSection />

        {/* 3. Problem - Pain points */}
        <ProblemSection />

        {/* 3. Solution - Outcomes */}
        <AboutSection />

        {/* 4. Social Proof - Testimonials */}
        <TestimonialsSection />

        {/* 5. How It Works - 3 steps */}
        <HowItWorksSection />

        {/* 6. Properties - Real listings */}
        <PropertiesSection />

        {/* 7. Final CTA - Conversion */}
        <CTASection />
      </main>
      <Footer />
    </ForceLightMode>
  );
}
