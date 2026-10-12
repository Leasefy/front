import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * La página de la inmobiliaria en Leasefy (`leasefy.co/i/<nombre>`, Nico
 * 09-10-2026): «el perfil reemplaza su página web». El título y la
 * descripción salen de su página pública, para que el enlace se vea bien al
 * compartirlo. Si el back no responde, el título genérico. Si el back dice que
 * no existe, la respuesta es un 404 de verdad (antes era un 200 con «No
 * encontramos esa inmobiliaria»: un buscador la guardaba como página).
 */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

function pedirLaPagina(nombre: string) {
  return fetch(`${BACKEND_URL}/marketplace/inmobiliarias/${encodeURIComponent(nombre)}`, {
    next: { revalidate: 300 },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ nombre: string }> }): Promise<Metadata> {
  const { nombre } = await params;
  try {
    const res = await pedirLaPagina(nombre);
    if (!res.ok) throw new Error(String(res.status));
    const p = (await res.json()) as {
      nombre: string;
      lema: string | null;
      inmuebles: number;
      portadaUrl: string | null;
    };
    const descripcion =
      p.lema ??
      `${p.inmuebles} ${p.inmuebles === 1 ? 'inmueble publicado' : 'inmuebles publicados'}. Pregúntale lo que buscas.`;
    return {
      // La plantilla del layout raíz ya agrega «| Leasefy».
      title: p.nombre,
      description: descripcion,
      openGraph: {
        title: p.nombre,
        description: descripcion,
        type: 'website',
        ...(p.portadaUrl ? { images: [{ url: p.portadaUrl }] } : {}),
      },
      alternates: { canonical: `/i/${nombre}` },
    };
  } catch {
    return { title: 'Inmobiliaria' };
  }
}

export default async function PaginaDeLaInmobiliariaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ nombre: string }>;
}) {
  const { nombre } = await params;
  // Sólo un «no existe» del back es 404; si el back no responde, la página
  // cliente dice «No pudimos abrir esta página» como siempre.
  const res = await pedirLaPagina(decodeURIComponent(nombre)).catch(() => null);
  if (res?.status === 404) notFound();
  return <>{children}</>;
}
