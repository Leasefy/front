import { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/data/blog-posts";
import { ArticleJsonLd } from "@/components/seo/JsonLd";
import { BlogArticle } from "@/components/landing/blog/BlogArticle";

interface Props {
  params: Promise<{ slug: string }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://leasefy.co';

// Thin route shell (landing-react-port SLICE 6). `generateMetadata`/
// `generateStaticParams`/`notFound()` are UNCHANGED from the pre-restyle
// page (design §2 risk: this route is SEO-bearing, indexable content — its
// metadata must survive the restyle intact). Only the rendered presentation
// swaps to the shared `<BlogArticle>` component. Lives inside the
// `(landing)` route group so it inherits scoped fonts + header/footer from
// `(landing)/layout.tsx`.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "Articulo no encontrado" };

  const articleUrl = `${siteUrl}/blog/${slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags || [],
    authors: [{ name: post.author || "Leasefy" }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: articleUrl,
      siteName: "Leasefy",
      images: [{ url: post.image, width: 1200, height: 630, alt: post.title }],
      type: "article",
      locale: "es_CO",
      publishedTime: post.date,
      section: post.category,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.image],
      creator: "@leasefy",
    },
    alternates: {
      canonical: articleUrl,
    },
  };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <>
      <ArticleJsonLd
        title={post.title}
        description={post.excerpt}
        url={`/blog/${slug}`}
        image={post.image}
        datePublished={post.date}
        authorName={post.author || "Leasefy"}
        section={post.category}
        tags={post.tags || []}
      />
      <BlogArticle post={post} related={related} />
    </>
  );
}
