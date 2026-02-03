import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { blogPosts } from "@/lib/data/blog-posts";
import { ArticleJsonLd } from "@/components/seo/JsonLd";

interface Props {
  params: Promise<{ slug: string }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arriendofacil.co';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "Articulo no encontrado" };

  const articleUrl = `${siteUrl}/blog/${slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags || [],
    authors: [{ name: post.author || "Arriendo Facil" }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: articleUrl,
      siteName: "Arriendo Facil",
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
      creator: "@arriendofacil",
    },
    alternates: {
      canonical: articleUrl,
    },
  };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={key++}
          className="text-[1.35rem] md:text-[1.6rem] font-medium text-foreground tracking-[-0.02em] leading-tight mt-10 mb-4"
        >
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={key++} className="text-[15px] font-semibold text-foreground mt-4 mb-1">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.match(/^\d+\.\s\*\*/)) {
      const text = line.replace(/\*\*(.*?)\*\*/g, "$1");
      const match = line.match(/^\d+\.\s\*\*(.*?)\*\*:\s?(.*)/);
      if (match) {
        elements.push(
          <li key={key++} className="text-[15px] leading-[1.8] text-muted-foreground ml-5 list-decimal mb-2">
            <strong className="text-foreground">{match[1]}</strong>: {match[2]}
          </li>
        );
      } else {
        elements.push(
          <li key={key++} className="text-[15px] leading-[1.8] text-muted-foreground ml-5 list-decimal mb-2">
            {text}
          </li>
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      // Handle inline bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      elements.push(
        <p key={key++} className="text-[15px] leading-[1.85] text-muted-foreground mb-1">
          {parts.map((part, i) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={i} className="text-foreground font-medium">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      );
    }
  }

  return elements;
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
        authorName={post.author || "Arriendo Facil"}
        section={post.category}
        tags={post.tags || []}
      />
      <Navbar />
      <main id="main-content" className="bg-background">
        {/* Hero image */}
        <div className="relative h-[50vh] md:h-[60vh] w-full overflow-hidden">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-16">
            <div className="mx-auto max-w-[720px]">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full border border-white/10 text-[11px] font-medium text-white/90 tracking-wide uppercase">
                  {post.category}
                </span>
                <span className="text-[12px] text-white/50">{post.date}</span>
                <span className="text-[12px] text-white/40">·</span>
                <span className="text-[12px] text-white/50">{post.readTime}</span>
              </div>

              <h1 className="text-[1.75rem] md:text-[2.5rem] font-medium text-white tracking-[-0.02em] leading-[1.15]">
                {post.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Article body */}
        <article className="py-12 md:py-20">
          <div className="mx-auto max-w-[720px] px-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-10"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al inicio
            </Link>

            {post.content ? (
              <div>{renderContent(post.content)}</div>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-[15px]">
                  Este artículo estará disponible pronto.
                </p>
              </div>
            )}
          </div>
        </article>

        {/* Related articles */}
        {related.length > 0 && (
          <section className="border-t border-border py-16 md:py-20">
            <div className="mx-auto max-w-[1400px] px-6 md:px-12">
              <h2 className="text-[1.25rem] md:text-[1.5rem] font-light text-foreground tracking-[-0.02em] italic mb-10">
                Artículos relacionados
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={r.href}
                    className="group block overflow-hidden"
                    style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <div className="relative h-[200px] overflow-hidden">
                      <Image
                        src={r.image}
                        alt={r.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>

                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-medium text-indigo-600 tracking-wide uppercase">
                          {r.category}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{r.readTime}</span>
                      </div>

                      <h3 className="text-[15px] font-medium text-foreground tracking-[-0.01em] leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors duration-300 mb-2">
                        {r.title}
                      </h3>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground/70">{r.date}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-indigo-600 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
