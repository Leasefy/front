import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { IntroSection } from "@/components/home/IntroSection";
import { ProblemSection } from "@/components/home/ProblemSection";
// --- Commented out for agency-only launch (tenant property listings) ---
// import { PropertiesSection } from "@/components/home/PropertiesSection";
// -----------------------------------------
import { AboutSection } from "@/components/home/AboutSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { CTASection } from "@/components/home/CTASection";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://leasefy.co';

export const metadata: Metadata = {
  title: "Leasefy — Software para inmobiliarias | Gestión de arriendos en Colombia",
  description:
    "Plataforma de gestión de arriendos para inmobiliarias en Colombia. Evaluación AI de inquilinos, cobro automatizado, dispersiones, contratos digitales y agentes AI que trabajan 24/7. Administra más propiedades sin aumentar tu equipo.",
  openGraph: {
    title: "Leasefy — Software para inmobiliarias | Gestión de arriendos en Colombia",
    description:
      "Administra más propiedades sin aumentar tu equipo. Evaluación AI, cobros automáticos, dispersiones y agentes AI para inmobiliarias en Colombia.",
    url: siteUrl,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Leasefy — Software para inmobiliarias en Colombia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Leasefy — Software para inmobiliarias | Gestión de arriendos en Colombia",
    description:
      "Plataforma de gestión de arriendos para inmobiliarias. Evaluación AI, cobros automáticos y agentes AI.",
    images: ["/og-image.jpg"],
    creator: "@leasefy",
  },
  keywords: [
    "software inmobiliario Colombia",
    "gestión de arriendos inmobiliarias",
    "administración inmobiliaria",
    "evaluación inquilinos AI",
    "cobro de arriendos automatizado",
    "dispersiones arriendos",
    "contratos digitales arriendo",
    "plataforma inmobiliaria Colombia",
    "ERP inmobiliario",
    "agentes AI inmobiliarias",
  ],
  alternates: {
    canonical: siteUrl,
  },
};

/**
 * Landing Page - Agency-Focused (Inmobiliarias)
 *
 * Conversion flow optimized for real estate agencies:
 * 1. Hero - AI-powered management
 * 2. Solution - Platform benefits (AboutSection)
 * 3. Social Proof - Agency testimonials
 * 4. How It Works - Agency workflow
 * 5. Final CTA - Conversion
 *
 * --- Commented out for agency-only launch ---
 * - IntroSection (tenant/landlord audience cards)
 * - ProblemSection (tenant pain points)
 * - PropertiesSection (property listings for tenants)
 */
export default function House() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* 1. Hero */}
        <HeroSection />

        {/* 2. Intro - Value proposition */}
        <IntroSection />

        {/* 3. Problem - Pain points */}
        <ProblemSection />

        {/* 4. Solution - Platform benefits */}
        <AboutSection />

        {/* 3. Social Proof */}
        <TestimonialsSection />

        {/* 4. How It Works */}
        <HowItWorksSection />

        {/* --- Commented out: tenant-focused property listings ---
        <PropertiesSection />
        --- */}

        {/* 5. Final CTA */}
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
