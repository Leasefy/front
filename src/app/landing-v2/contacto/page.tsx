import type { Metadata } from "next";
import ContactPage from "@/components/landing-v2/ContactPage";

export const metadata: Metadata = {
  title: "Contacto — Leasefy",
  description: "Hablemos de tu operación. Te mostramos, con tus propios casos, cómo se ve en piloto automático.",
  robots: { index: false, follow: false },
};

export default function LandingV2ContactoPage() {
  return <ContactPage />;
}
