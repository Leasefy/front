import { Metadata } from "next";
import { alternativasDelIdioma, idiomaDeLaPeticion } from "@/lib/idioma/metadata";
import { TEXTOS_DEL_AVALUO as TEXTOS } from "./textos-para-buscadores";

/** SEO (24-10): la página del avalúo está en español e inglés (useTx): cada idioma con su título, canonical y hreflang. */
export async function generateMetadata(): Promise<Metadata> {
  const idioma = await idiomaDeLaPeticion();
  const t = TEXTOS[idioma];
  return {
    title: t.title,
    description: t.description,
    openGraph: { title: t.title, description: t.og, type: "website", locale: idioma === "en" ? "en_US" : "es_CO" },
    alternates: alternativasDelIdioma("/avaluo", idioma),
  };
}

export default function AvaluoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
