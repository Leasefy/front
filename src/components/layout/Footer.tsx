"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const menuLinks = [
  { href: "/", label: "Inicio" },
  { href: "/propiedades", label: "Propiedades" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/contacto", label: "Contacto" },
];

const pageLinks = [
  { href: "/nosotros", label: "Nosotros" },
  { href: "/blog", label: "Blog" },
  { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
];

const socialLinks = [
  {
    name: "X",
    href: "#",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "#",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "#",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
      </svg>
    ),
  },
];

/**
 * Footer - Luxterra pixel-perfect clone
 * Dark background #111112, structured layout, large brand text
 * Exact CSS values from Luxterra:
 * - Section headings: 18px, -0.72px letter-spacing, white/60%
 * - Footer bg: #111112
 * - Footer padding top: 80px
 */
export function Footer() {
  return (
    <footer className="bg-[#111112] text-white overflow-hidden">
      {/* Main Content - 80px padding top */}
      <div className="mx-auto max-w-[1356px] px-8 pt-[80px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
          {/* Left Column - Menu & Social */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Section Title - 18px, -0.72px letter-spacing, white/60% */}
            <h4 className="text-[18px] tracking-[-0.72px] leading-[24px] text-white/60 mb-[20px]">
              Menu
            </h4>
            <nav className="space-y-3">
              {menuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-[16px] tracking-[-0.32px] leading-[21.6px] text-white/70 hover:text-white transition-colors group/link"
                >
                  <span className="relative overflow-hidden inline-block">
                    <span className="block transition-transform duration-300 group-hover/link:-translate-y-full">
                      {link.label}
                    </span>
                    <span className="block absolute top-full transition-transform duration-300 group-hover/link:-translate-y-full">
                      {link.label}
                    </span>
                  </span>
                </Link>
              ))}
            </nav>

            {/* Social Links */}
            <div className="mt-[32px]">
              <h4 className="text-[18px] tracking-[-0.72px] leading-[24px] text-white/60 mb-[20px]">
                Siguenos
              </h4>
              <div className="flex gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="text-white/50 hover:text-white transition-colors"
                    aria-label={social.name}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Center Column - Newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:border-x md:border-white/10 md:px-12"
          >
            {/* Newsletter text - 16px, -0.32px letter-spacing, white/60% */}
            <p className="text-[16px] tracking-[-0.32px] leading-[21.6px] text-white/60 text-center mb-[24px]">
              Suscribete a nuestro boletin para recibir nuevas propiedades, consejos y mas
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Tu correo electronico"
                className="flex-1 h-[44px] px-4 bg-white/5 border border-white/10 rounded-l-[2px] text-[16px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 tracking-[-0.32px]"
              />
              <button className="h-[44px] px-[20px] bg-white text-[#111112] rounded-r-[2px] text-[15px] tracking-[-0.15px] hover:bg-white/90 transition-colors">
                Suscribir
              </button>
            </div>
          </motion.div>

          {/* Right Column - Pages & Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:pl-8"
          >
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-[18px] tracking-[-0.72px] leading-[24px] text-white/60 mb-[20px]">
                  Paginas
                </h4>
                <nav className="space-y-3">
                  {pageLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block text-[16px] tracking-[-0.32px] leading-[21.6px] text-white/70 hover:text-white transition-colors group/link"
                    >
                      <span className="relative overflow-hidden inline-block">
                        <span className="block transition-transform duration-300 group-hover/link:-translate-y-full">
                          {link.label}
                        </span>
                        <span className="block absolute top-full transition-transform duration-300 group-hover/link:-translate-y-full">
                          {link.label}
                        </span>
                      </span>
                    </Link>
                  ))}
                </nav>
              </div>
              <div>
                <h4 className="text-[18px] tracking-[-0.72px] leading-[24px] text-white/60 mb-[20px]">
                  Contacto
                </h4>
                <div className="space-y-3 text-[16px] tracking-[-0.32px] leading-[21.6px] text-white/70">
                  <a
                    href="tel:+573001234567"
                    className="block hover:text-white transition-colors"
                  >
                    +57 300 123 4567
                  </a>
                  <a
                    href="mailto:info@arriendofacil.co"
                    className="block hover:text-white transition-colors"
                  >
                    info@arriendofacil.co
                  </a>
                  <p>Bogota, Colombia</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Large Brand Text - Luxterra style with gradient */}
        <div className="relative overflow-hidden border-t border-white/10 mt-[60px] pt-[48px] pb-[32px]">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-[15vw] md:text-[12vw] font-normal tracking-[-0.06em] leading-none select-none lowercase whitespace-nowrap bg-gradient-to-r from-white/20 via-white/30 to-white/10 bg-clip-text text-transparent"
          >
            arriendo facil
          </motion.h2>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 py-[24px] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[14px] tracking-[-0.28px] text-white/40">
            © 2024 Arriendo Facil. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacidad"
              className="text-[14px] tracking-[-0.28px] text-white/40 hover:text-white/70 transition-colors"
            >
              Privacidad
            </Link>
            <Link
              href="/terminos"
              className="text-[14px] tracking-[-0.28px] text-white/40 hover:text-white/70 transition-colors"
            >
              Terminos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
