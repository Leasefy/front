"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/section-label";
import { ArrowUpRight } from '@phosphor-icons/react';
import { blogPosts } from "@/lib/data/blog-posts";

export function RecentInsightsSection() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="container-platform">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-14 md:mb-16">
          <div>
            <SectionLabel className="mb-4">Blog</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.5rem] font-heading font-light text-foreground leading-[1.2] tracking-[-0.02em] italic">
              Artículos recientes
            </h2>
          </div>
          <Link
            href="/blog"
            className="mt-4 md:mt-0 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:text-indigo-600 transition-colors group"
          >
            Ver todos los artículos
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Bento blog grid: first post hero (7col), rest stacked (5col) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Hero post — left, tall */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="md:col-span-7 md:row-span-2"
          >
            <Link href={blogPosts[0].href} className="group relative block h-[400px] md:h-full min-h-[500px] overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
              <Image
                src={blogPosts[0].image}
                alt={blogPosts[0].title}
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 58vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />

              <div className="absolute bottom-0 left-0 right-0 p-7 md:p-9">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full border border-white/10 text-[11px] font-medium text-white/90 tracking-wide uppercase">
                    {blogPosts[0].category}
                  </span>
                  <span className="text-[12px] text-white/50">{blogPosts[0].date}</span>
                  <span className="text-[12px] text-white/40">·</span>
                  <span className="text-[12px] text-white/50">{blogPosts[0].readTime}</span>
                </div>

                <h3 className="text-[1.5rem] md:text-[2rem] font-heading font-medium text-white tracking-[-0.02em] leading-tight mb-2 max-w-lg">
                  {blogPosts[0].title}
                </h3>
                <p className="text-[14px] text-white/60 leading-relaxed max-w-md">
                  {blogPosts[0].excerpt}
                </p>
              </div>
            </Link>
          </motion.div>

          {/* Right column — 3 stacked vertical cards */}
          <div className="md:col-span-5 md:row-span-2 flex flex-col gap-4">
            {blogPosts.slice(1).map((post, index) => (
              <motion.div
                key={post.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: (index + 1) * 0.08 }}
                className="flex-1"
              >
                <Link
                  href={post.href}
                  className="group flex gap-5 h-full items-stretch transition-colors duration-300 hover:bg-neutral-50"
                  style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  {/* Image — left, fixed width, full card height */}
                  <div className="relative w-[160px] flex-shrink-0 overflow-hidden">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="160px"
                    />
                  </div>

                  {/* Content — right */}
                  <div className="flex flex-col justify-center py-4 pr-5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-medium text-indigo-600 tracking-wide uppercase">
                        {post.category}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{post.readTime}</span>
                    </div>

                    <h3 className="text-[15px] font-heading font-medium text-foreground tracking-[-0.01em] leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors duration-300 mb-2">
                      {post.title}
                    </h3>

                    <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                      {post.excerpt}
                    </p>

                    <span className="text-[11px] text-muted-foreground/70">
                      {post.date}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
