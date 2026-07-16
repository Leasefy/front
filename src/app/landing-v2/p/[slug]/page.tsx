import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductPage from "@/components/landing-v2/ProductPage";
import { PRODUCTS } from "@/components/landing-v2/products-data";

export function generateStaticParams() {
  return Object.keys(PRODUCTS).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const d = PRODUCTS[params.slug];
  if (!d) return { title: "Leasefy", robots: { index: false, follow: false } };
  return {
    title: `${d.t} — Leasefy`,
    description: d.lead,
    robots: { index: false, follow: false }, // preview — no indexar hasta el swap de /
  };
}

export default function LandingV2ProductPage({ params }: { params: { slug: string } }) {
  if (!PRODUCTS[params.slug]) notFound();
  return <ProductPage slug={params.slug} />;
}
