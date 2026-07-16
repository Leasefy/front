import { MetadataRoute } from 'next';
import { blogPosts } from '@/lib/data/blog-posts';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://leasefy.co';

  // Static pages with their priorities and change frequencies
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/propiedades`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ayuda`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Product pages: the old /productos/{evaluacion,pagos,contratos,
    // aplicaciones,seguro,api} taxonomy was retired in SLICE 8 (301
    // redirects, see src/lib/landing/legacy-redirects.ts) — listing those
    // dead URLs here would just point crawlers at redirects. The new
    // 8-product taxonomy under (landing)/productos/* stays out of the
    // sitemap while it is still noindex-gated (LANDING_STAGE=true,
    // src/lib/landing/landing-stage.ts); add it back when SLICE 9 flips
    // LANDING_STAGE to false.
    // Audience pages
    {
      url: `${baseUrl}/para/propietarios`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/para/inquilinos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/para/inmobiliarias`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/para/agentes`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Dynamic blog posts
  // Note: post.date is in Spanish format "Ene 15, 2026", use current date as fallback
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(), // Use current date since post.date is localized string
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // TODO: Add dynamic property pages when database is connected
  // const propertyPages = await getProperties().then(properties =>
  //   properties.map(p => ({
  //     url: `${baseUrl}/propiedades/${p.id}`,
  //     lastModified: new Date(p.updatedAt),
  //     changeFrequency: 'daily',
  //     priority: 0.7,
  //   }))
  // );

  return [...staticPages, ...blogPages];
}
