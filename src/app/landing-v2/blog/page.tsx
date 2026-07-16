import type { Metadata } from "next";
import BlogPage from "@/components/landing-v2/BlogPage";

export const metadata: Metadata = {
  title: "Blog — Leasefy",
  description: "Ideas, guías y tendencias del mercado inmobiliario en Colombia.",
  robots: { index: false, follow: false },
};

export default function LandingV2BlogPage() {
  return <BlogPage />;
}
