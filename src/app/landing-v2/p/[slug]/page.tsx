import ComingSoon from "@/components/landing-v2/ComingSoon";

const NAMES: Record<string, string> = {
  crm: "CRM inmobiliario",
  erp: "ERP de arriendos",
  cobranza: "Cobranza",
  inquilino: "Estudio del inquilino",
  avaluos: "Avalúos",
  conciliacion: "Conciliación",
  matching: "Matching",
  asegurabilidad: "Asegurabilidad",
};

export default function LandingV2ProductPage({ params }: { params: { slug: string } }) {
  const name = NAMES[params.slug] ?? "Producto";
  return <ComingSoon eyebrow="Producto" title={`${name} — página de producto en la Fase 2`} />;
}
