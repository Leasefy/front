import { MetadataRoute } from 'next';
import { IDIOMAS } from '@/lib/idioma/idioma';

// Per-customer avaluo pages (property + owner data) and the ARCO / Habeas Data
// forms (per-agency, personal data, token URLs). The language middleware
// serves them under /es and /en too, so each is blocked unprefixed AND prefixed.
const AVALUO_PRIVADAS = ['/avaluo/reporte/', '/avaluo/estado/', '/avaluo/verificar/', '/arco/'];
const AVALUO_PRIVADAS_POR_IDIOMA = [
  ...AVALUO_PRIVADAS,
  ...IDIOMAS.flatMap((idioma) => AVALUO_PRIVADAS.map((ruta) => `/${idioma}${ruta}`)),
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://leasefy.co';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/panel/',       // Landlord dashboard (private)
          '/inquilino/',   // Tenant dashboard (private)
          '/api/',         // API routes
          '/auth/',        // Auth pages
          '/aplicar/',     // Application forms (private data)
          ...AVALUO_PRIVADAS_POR_IDIOMA, // Informe/estado/certificado con datos del inmueble y de su dueño
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',     // Block AI crawlers if desired
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
