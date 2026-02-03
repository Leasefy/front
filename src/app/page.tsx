import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { AboutSection } from "@/components/home/AboutSection";
import { StatsSection } from "@/components/home/StatsSection";
import { PropertiesSection } from "@/components/home/PropertiesSection";
import { CitiesSection } from "@/components/home/CitiesSection";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { TopAgentsSection } from "@/components/home/TopAgentsSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { RecentInsightsSection } from "@/components/home/RecentInsightsSection";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <PropertiesSection />
        <AboutSection />
        {/* <StatsSection /> */}
        <CitiesSection />
        <WhyUsSection />
        <ServicesSection />
        {/* <TopAgentsSection /> */}
        <TestimonialsSection />
        <RecentInsightsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
