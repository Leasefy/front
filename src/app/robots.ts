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
          // SEO (24-10): sin valor para un buscador o duplicados de una dirección final
          '/ir-al-panel',   // «Ir al panel» de la landing: redirige a cada quien a su panel
          '/publica',       // el publicador: pide cuenta
          '/paginas/',      // las páginas armadas: se ven en /es y /en (su canonical)
          '/landing/index.html$', '/internas/productos/index.html$', '/internas/para/index.html$', // sus fuentes
        ],
      },
      // Antes había un bloqueo a GPTBot «por si acaso»; Nico (24-10): «para que podamos aparecer en todo lado».
      // Las IA (ChatGPT, Perplexity, Claude, Gemini) leen lo público como cualquier buscador; lo privado de arriba
      // sigue cerrado para todos (la regla de «*» aplica a cada uno).
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
