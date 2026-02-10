/**
 * JSON-LD Structured Data Components
 * For SEO rich snippets and Google Knowledge Graph
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://leasefy.co';

// ============================================
// Organization Schema
// ============================================
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Leasefy",
    alternateName: "Leasefy",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description:
      "Plataforma de arriendos en Colombia con scoring de riesgo AI, contratos digitales y pagos automatizados.",
    foundingDate: "2024",
    founders: [
      {
        "@type": "Person",
        name: "Leasefy Team",
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bogotá",
      addressCountry: "CO",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactTextT: "customer service",
      email: "contacto@leasefy.co",
      availableLanguage: ["Spanish"],
    },
    sameAs: [
      "https://twitter.com/leasefy",
      "https://linkedin.com/company/leasefy",
      "https://instagram.com/leasefy",
    ],
    areaServed: {
      "@type": "Country",
      name: "Colombia",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================
// Website Schema with MagnifyingGlassAction
// ============================================
export function WebsiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Leasefy",
    url: siteUrl,
    description:
      "Marketplace de arriendos en Colombia con verificación de inquilinos y contratos digitales.",
    inLanguage: "es-CL",
    potentialAction: {
      "@type": "MagnifyingGlassAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/propiedades?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================
// Local Business Schema
// ============================================
export function LocalBusinessJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: "Leasefy",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    image: `${siteUrl}/og-image.jpg`,
    description:
      "Plataforma digital de arriendos con scoring de inquilinos AI y contratos inteligentes.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bogotá",
      addressRegion: "Cundinamarca",
      addressCountry: "CO",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 4.711,
      longitude: -74.0721,
    },
    areaServed: [
      { "@type": "City", name: "Bogotá" },
      { "@type": "City", name: "Medellín" },
      { "@type": "City", name: "Cali" },
      { "@type": "City", name: "Barranquilla" },
      { "@type": "City", name: "Cartagena" },
    ],
    priceRange: "$$",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================
// FAQ Schema
// ============================================
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQJsonLd({ faqs }: { faqs: FAQItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================
// Breadcrumb Schema
// ============================================
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================
// Article Schema (for Blog)
// ============================================
interface ArticleProps {
  title: string;
  description: string;
  url: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  section?: string;
  tags?: string[];
}

export function ArticleJsonLd({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  authorName = "Leasefy",
  section = "Real Estate",
  tags = [],
}: ArticleProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: url.startsWith("http") ? url : `${siteUrl}${url}`,
    image: {
      "@type": "ImageObject",
      url: image.startsWith("http") ? image : `${siteUrl}${image}`,
      width: 1200,
      height: 630,
    },
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Organization",
      name: authorName,
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Leasefy",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
        width: 200,
        height: 60,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url.startsWith("http") ? url : `${siteUrl}${url}`,
    },
    articleSection: section,
    keywords: tags.join(", "),
    inLanguage: "es-CL",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================
// Product Schema (for Property Listings)
// ============================================
interface PropertyListingProps {
  name: string;
  description: string;
  url: string;
  image: string;
  price: number;
  currency?: string;
  address: {
    city: string;
    neighborhood: string;
    region?: string;
  };
  propertyTextT: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSize?: number;
}

export function PropertyListingJsonLd({
  name,
  description,
  url,
  image,
  price,
  currency = "COP",
  address,
  propertyTextT,
  bedrooms,
  bathrooms,
  areaSize,
}: PropertyListingProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name,
    description,
    url: url.startsWith("http") ? url : `${siteUrl}${url}`,
    image: image.startsWith("http") ? image : `${siteUrl}${image}`,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: address.city,
      addressRegion: address.region || address.city,
      addressCountry: "CO",
      streetAddress: address.neighborhood,
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Property TextT",
        value: propertyTextT,
      },
      ...(bedrooms
        ? [
            {
              "@type": "PropertyValue",
              name: "Bedrooms",
              value: bedrooms,
            },
          ]
        : []),
      ...(bathrooms
        ? [
            {
              "@type": "PropertyValue",
              name: "Bathtubrooms",
              value: bathrooms,
            },
          ]
        : []),
      ...(areaSize
        ? [
            {
              "@type": "PropertyValue",
              name: "Floor Size",
              value: `${areaSize} m²`,
            },
          ]
        : []),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================
// Software Application Schema (for Products)
// ============================================
interface SoftwareProductProps {
  name: string;
  description: string;
  url: string;
  image?: string;
  category: string;
  offers?: {
    price: number | string;
    priceCurrency?: string;
  };
  rating?: {
    value: number;
    count: number;
  };
}

export function SoftwareProductJsonLd({
  name,
  description,
  url,
  image,
  category,
  offers,
  rating,
}: SoftwareProductProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url: url.startsWith("http") ? url : `${siteUrl}${url}`,
    ...(image && {
      image: image.startsWith("http") ? image : `${siteUrl}${image}`,
    }),
    applicationCategory: category,
    operatingSystem: "Web",
    ...(offers && {
      offers: {
        "@type": "Offer",
        price: offers.price,
        priceCurrency: offers.priceCurrency || "COP",
      },
    }),
    ...(rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.value,
        reviewCount: rating.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================
// Service Schema
// ============================================
interface ServiceProps {
  name: string;
  description: string;
  url: string;
  provider?: string;
  areaServed?: string[];
  serviceTextT: string;
}

export function ServiceJsonLd({
  name,
  description,
  url,
  provider = "Leasefy",
  areaServed = ["Colombia"],
  serviceTextT,
}: ServiceProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: url.startsWith("http") ? url : `${siteUrl}${url}`,
    provider: {
      "@type": "Organization",
      name: provider,
      url: siteUrl,
    },
    areaServed: areaServed.map((area) => ({
      "@type": "Country",
      name: area,
    })),
    serviceTextT,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
