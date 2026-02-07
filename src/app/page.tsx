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
