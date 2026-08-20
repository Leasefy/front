import { MetadataRoute } from 'next';

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
          '/avaluo/reporte/', // Informe con datos del inmueble y de su dueño
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
