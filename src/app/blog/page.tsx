"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionLabel } from "@/components/ui/section-label";
import { ArrowUpRight } from '@phosphor-icons/react';
import { blogPosts, blogCategories } from "@/lib/data/blog-posts";

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filtered =
    activeCategory === "Todos"
      ? blogPosts
      : blogPosts.filter((p) => p.category === activeCategory);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-background">
        {/* Header */}
        <section className="pt-32 pb-10 md:pt-40 md:pb-14">
          <div className="container-platform">
            <SectionLabel className="mb-4">Blog</SectionLabel>
            <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-6">
              Ideas, guías y tendencias<br className="hidden md:block" /> del mercado inmobiliario
            </h1>

            {/* Category pills */}
            <div className="flex flex-wrap gap-2 mt-8">
              {blogCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 text-[13px] font-medium tracking-wide transition-colors duration-200 border ${
                    activeCategory === cat
                      ? "bg-foreground text-white border-foreground"
                      : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Featured post */}
        {featured && (
          <section className="pb-6">
            <div className="container-platform">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Link
                  href={featured.href}
                  className="group relative block h-[400px] md:h-[520px] overflow-hidden"
                  style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <Image
                    src={featured.image}
                    alt={featured.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 1400px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />

                  <div className="absolute bottom-0 left-0 right-0 p-7 md:p-12">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full border border-white/10 text-[11px] font-medium text-white/90 tracking-wide uppercase">
                        {featured.category}
                      </span>
                      <span className="text-[12px] text-white/50">{featured.date}</span>
                      <span className="text-[12px] text-white/40">·</span>
                      <span className="text-[12px] text-white/50">{featured.readTime}</span>
                    </div>

                    <h2 className="text-[1.5rem] md:text-[2.25rem] font-medium text-white tracking-[-0.02em] leading-tight mb-3 max-w-2xl">
                      {featured.title}
                    </h2>
                    <p className="text-[14px] md:text-[15px] text-white/60 leading-relaxed max-w-xl">
                      {featured.excerpt}
                    </p>
                  </div>
                </Link>
              </motion.div>
            </div>
          </section>
        )}

        {/* Grid */}
        {rest.length > 0 && (
          <section className="py-10 md:py-16">
            <div className="container-platform">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rest.map((post, index) => (
                  <motion.div
                    key={post.slug}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: index * 0.08 }}
                  >
                    <Link
                      href={post.href}
                      className="group block overflow-hidden"
                      style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                    >
                      <div className="relative h-[220px] overflow-hidden">
                        <Image
                          src={post.image}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>

                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[11px] font-medium text-indigo-600 tracking-wide uppercase">
                            {post.category}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{post.readTime}</span>
                        </div>

                        <h3 className="text-[15px] font-medium text-foreground tracking-[-0.01em] leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors duration-300 mb-2">
                          {post.title}
                        </h3>

                        <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                          {post.excerpt}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground/70">{post.date}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-600" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
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
