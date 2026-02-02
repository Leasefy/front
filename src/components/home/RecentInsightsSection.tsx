"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const blogPosts = [
  {
    title: "Las mejores formas de invertir en propiedades en Colombia",
    category: "Inversiones",
    date: "Jul 10, 2024",
    image: "https://images.pexels.com/photos/7578939/pexels-photo-7578939.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/blog/invertir-propiedades-colombia",
  },
  {
    title: "Lo que los vendedores deben saber antes de publicar",
    category: "Inmobiliario",
    date: "Jun 19, 2025",
    image: "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/blog/vendedores-consejos",
  },
  {
    title: "Por que Colombia sigue siendo la mejor opcion para nuevos residentes",
    category: "Inmobiliario",
    date: "Sep 5, 2024",
    image: "https://images.pexels.com/photos/6899260/pexels-photo-6899260.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/blog/colombia-mejor-opcion",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

/**
 * RecentInsightsSection - Luxterra pixel-perfect clone
 * Exact CSS values extracted from Luxterra
 */
export function RecentInsightsSection() {
  return (
    <section className="bg-white overflow-hidden">
      <div className="mx-auto max-w-[1356px] px-8 py-[90px] pb-[100px]">
        {/* Header - Centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center gap-[10px] mb-[60px]"
        >
          {/* Label with purple dot */}
          <div className="flex items-center gap-2">
            <span className="w-[6px] h-[6px] rounded-full bg-primary" />
            <span className="text-[16px] tracking-[-0.32px] leading-[21.6px] text-black/60">
              Blog
            </span>
          </div>

          {/* Main heading - 58px, -4.176px letter-spacing */}
          <h2 className="text-[40px] md:text-[58px] font-normal text-primary tracking-[-4.176px] leading-[1.05]">
            Articulos recientes
          </h2>

          {/* Description - 18px, -0.72px letter-spacing, max-width 400px */}
          <p className="text-[18px] tracking-[-0.72px] leading-[24px] text-black/70 max-w-[400px]">
            Compartimos actualizaciones practicas y guias sobre el mercado inmobiliario colombiano
          </p>
        </motion.div>

        {/* Blog Cards Grid - 3 columns with gap */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-[20px]"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {blogPosts.map((post) => (
            <motion.div key={post.title} variants={cardVariants}>
              <Link href={post.href} className="group block">
                {/* Post Image - aspect ratio 4:3 */}
                <div className="relative aspect-[4/3] mb-[20px] overflow-hidden rounded-sm bg-gray-100">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>

                {/* Post Meta - category pill + dot + date */}
                <div className="flex items-center gap-[8px] mb-[12px]">
                  {/* Category - 15px, -0.15px letter-spacing */}
                  <span className="inline-flex items-center px-[12px] py-[4px] rounded-sm bg-black/5 text-[15px] tracking-[-0.15px] leading-[20px] text-primary">
                    {post.category}
                  </span>
                  {/* Dot separator */}
                  <span className="w-[4px] h-[4px] rounded-full bg-black/30" />
                  {/* Date - 15px, -0.15px letter-spacing, black/70% */}
                  <span className="text-[15px] tracking-[-0.15px] leading-[20px] text-black/70">
                    {post.date}
                  </span>
                </div>

                {/* Post Title - 26px, -1.352px letter-spacing */}
                <h3 className="text-[26px] font-normal text-primary tracking-[-1.352px] leading-[29.9px] group-hover:text-black/70 transition-colors">
                  {post.title}
                </h3>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
