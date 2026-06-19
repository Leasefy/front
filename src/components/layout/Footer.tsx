"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";

const menuLinks = [
  { href: "/", label: "Inicio" },
  { href: "/propiedades", label: "Propiedades" },
  { href: "/pricing", label: "Precios" },
  { href: "/publicar", label: "Publicar Inmueble" },
  { href: "/auth", label: "Mi cuenta" },
];

const pageLinks = [
  { href: "/pricing", label: "Precios" },
  { href: "/propiedades", label: "Propiedades" },
  { href: "/pricing#faq", label: "Preguntas frecuentes" },
  { href: "/blog", label: "Blog" },
];

const socialLinks = [
  {
    name: "X",
    href: "https://x.com/leasefy",
    target: "_blank",
    rel: "noopener noreferrer",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://facebook.com/leasefy",
    target: "_blank",
    rel: "noopener noreferrer",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://instagram.com/leasefy",
    target: "_blank",
    rel: "noopener noreferrer",
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
    <footer className="bg-primary text-white uppercase tracking-wide font-mono overflow-hidden">
      {/* Main Content - 80px padding top */}
      <div className="container-platform pt-[80px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
          {/* Left Column - List & Social */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Section Title - 18px, -0.72px letter-spacing, white/60% */}
            <h4 className="text-[18px] tracking-[-0.72px] leading-[24px] text-white/60 mb-[20px]">
              List
            </h4>
            {/* py-1.5 per row replaces space-y-3 (6px + 6px = same 12px gap)
                while growing each tap target; -my-1.5 keeps outer edges put */}
            <nav className="-my-1.5">
              {menuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-1.5 font-mono uppercase text-[14px] font-normal tracking-wide text-white/70 hover:text-white transition-colors group/link"
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
                Síguenos
              </h4>
              <div className="flex gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target={social.target}
                    rel={social.rel}
                    className="p-3 -m-3 text-white/50 hover:text-white transition-colors"
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
              Suscríbete a nuestro boletín para recibir nuevas propiedades, consejos y más
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
                if (!email) return;
                toast.success('¡Suscrito!', { description: 'Te enviaremos novedades a tu correo.' });
                form.reset();
              }}
              className="flex"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="Tu correo electrónico"
                aria-label="Correo electrónico para suscripción"
                className="flex-1 h-[44px] px-4 bg-white/5 border border-white/10 rounded-l-xl text-[16px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 tracking-[-0.32px]"
              />
              <button
                type="submit"
                className="h-[44px] px-[20px] bg-white text-primary rounded-r-xl text-[15px] tracking-[-0.15px] hover:bg-white/90 transition-colors"
              >
                Suscribir
              </button>
            </form>
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
                  Páginas
                </h4>
                <nav className="space-y-3">
                  {pageLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block font-mono uppercase text-[14px] font-normal tracking-wide text-white/70 hover:text-white transition-colors group/link"
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
                <div className="space-y-3 font-mono uppercase text-[14px] font-normal tracking-wide text-white/70">
                  <a
                    href="tel:+573001234567"
                    className="block hover:text-white transition-colors"
                  >
                    +57 300 123 4567
                  </a>
                  <a
                    href="mailto:info@leasefy.co"
                    className="block hover:text-white transition-colors"
                  >
                    info@leasefy.co
                  </a>
                  <p>Bogota, Colombia</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Large Brand Logo - Luxterra style with gradient */}
        <div className="relative overflow-hidden border-t border-white/10 mt-[60px] pt-[48px] pb-[32px]">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="select-none"
          >
            <svg
              viewBox="0 0 207 60"
              className="h-[15vw] md:h-[10vw] w-auto"
              fill="none"
            >
              <defs>
                <linearGradient id="footer-logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                </linearGradient>
              </defs>
              <path d="M5 51L29 27L47 45V15" stroke="url(#footer-logo-gradient)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M65.52 47V15.32H68.05V44.536H83.45V47H65.52ZM94.7989 47.66C92.5256 47.66 90.5602 47.154 88.9029 46.142C87.2456 45.1153 85.9622 43.6707 85.0529 41.808C84.1436 39.9307 83.6889 37.716 83.6889 35.164C83.6889 32.568 84.1362 30.3313 85.0309 28.454C85.9402 26.562 87.2162 25.11 88.8589 24.098C90.5162 23.086 92.4816 22.58 94.7549 22.58C97.0576 22.58 99.0229 23.108 100.651 24.164C102.294 25.2053 103.54 26.716 104.391 28.696C105.256 30.676 105.667 33.0593 105.623 35.846H102.983V34.966C102.91 31.71 102.176 29.2313 100.783 27.53C99.3896 25.8287 97.3949 24.978 94.7989 24.978C92.1149 24.978 90.0396 25.8653 88.5729 27.64C87.1209 29.4 86.3949 31.8933 86.3949 35.12C86.3949 38.3173 87.1209 40.796 88.5729 42.556C90.0396 44.316 92.1002 45.196 94.7549 45.196C96.5882 45.196 98.1869 44.7707 99.5509 43.92C100.93 43.0547 102.022 41.8227 102.829 40.224L105.117 41.236C104.164 43.2893 102.785 44.8733 100.981 45.988C99.1769 47.1027 97.1162 47.66 94.7989 47.66ZM85.4269 35.846V33.558H104.193V35.846H85.4269ZM114.724 47.66C112.89 47.66 111.365 47.3373 110.148 46.692C108.945 46.0467 108.043 45.196 107.442 44.14C106.84 43.0693 106.54 41.9107 106.54 40.664C106.54 39.3147 106.818 38.1853 107.376 37.276C107.948 36.3667 108.703 35.6333 109.642 35.076C110.595 34.5187 111.644 34.1007 112.788 33.822C114.093 33.5287 115.501 33.2793 117.012 33.074C118.522 32.854 119.96 32.6633 121.324 32.502C122.702 32.3407 123.824 32.2013 124.69 32.084L123.766 32.634C123.824 30.0673 123.34 28.1607 122.314 26.914C121.302 25.6527 119.512 25.022 116.946 25.022C115.142 25.022 113.653 25.4327 112.48 26.254C111.321 27.0607 110.507 28.3147 110.038 30.016L107.442 29.29C107.984 27.134 109.077 25.4767 110.72 24.318C112.362 23.1593 114.467 22.58 117.034 22.58C119.219 22.58 121.052 23.0053 122.534 23.856C124.03 24.7067 125.071 25.902 125.658 27.442C125.907 28.0727 126.076 28.8133 126.164 29.664C126.252 30.5 126.296 31.3433 126.296 32.194V47H123.986V40.752L124.844 40.972C124.125 43.1133 122.871 44.7633 121.082 45.922C119.292 47.0807 117.173 47.66 114.724 47.66ZM114.856 45.328C116.469 45.328 117.884 45.042 119.102 44.47C120.319 43.8833 121.302 43.0693 122.05 42.028C122.812 40.972 123.296 39.7327 123.502 38.31C123.648 37.518 123.729 36.66 123.744 35.736C123.758 34.812 123.766 34.13 123.766 33.69L124.866 34.394C123.912 34.5113 122.768 34.636 121.434 34.768C120.114 34.9 118.764 35.0613 117.386 35.252C116.007 35.4427 114.76 35.6847 113.646 35.978C112.956 36.1687 112.26 36.4473 111.556 36.814C110.866 37.166 110.287 37.6573 109.818 38.288C109.363 38.9187 109.136 39.718 109.136 40.686C109.136 41.4047 109.312 42.1233 109.664 42.842C110.03 43.5607 110.632 44.1547 111.468 44.624C112.304 45.0933 113.433 45.328 114.856 45.328ZM138.586 47.616C135.843 47.616 133.577 47.0367 131.788 45.878C130.013 44.7193 128.913 43.106 128.488 41.038L131.084 40.598C131.451 42.006 132.316 43.128 133.68 43.964C135.044 44.8 136.716 45.218 138.696 45.218C140.661 45.218 142.223 44.8 143.382 43.964C144.541 43.128 145.12 41.984 145.12 40.532C145.12 39.74 144.937 39.0947 144.57 38.596C144.218 38.0827 143.514 37.6133 142.458 37.188C141.402 36.7627 139.833 36.264 137.75 35.692C135.55 35.1053 133.827 34.5187 132.58 33.932C131.348 33.3453 130.475 32.678 129.962 31.93C129.463 31.182 129.214 30.2653 129.214 29.18C129.214 27.8747 129.588 26.7307 130.336 25.748C131.084 24.7507 132.125 23.9733 133.46 23.416C134.809 22.8587 136.364 22.58 138.124 22.58C139.884 22.58 141.468 22.8733 142.876 23.46C144.284 24.032 145.421 24.8387 146.286 25.88C147.151 26.9067 147.65 28.102 147.782 29.466L145.186 29.95C144.937 28.4247 144.167 27.222 142.876 26.342C141.585 25.4473 139.972 24.9927 138.036 24.978C136.203 24.9487 134.707 25.3153 133.548 26.078C132.389 26.826 131.81 27.816 131.81 29.048C131.81 29.752 132.008 30.3533 132.404 30.852C132.815 31.336 133.533 31.7833 134.56 32.194C135.587 32.6047 137.039 33.0447 138.916 33.514C141.204 34.1007 142.986 34.702 144.262 35.318C145.553 35.934 146.462 36.66 146.99 37.496C147.518 38.3173 147.782 39.3367 147.782 40.554C147.782 42.754 146.961 44.4847 145.318 45.746C143.69 46.9927 141.446 47.616 138.586 47.616ZM160.257 47.66C157.984 47.66 156.019 47.154 154.361 46.142C152.704 45.1153 151.421 43.6707 150.511 41.808C149.602 39.9307 149.147 37.716 149.147 35.164C149.147 32.568 149.595 30.3313 150.489 28.454C151.399 26.562 152.675 25.11 154.317 24.098C155.975 23.086 157.94 22.58 160.213 22.58C162.516 22.58 164.481 23.108 166.109 24.164C167.752 25.2053 168.999 26.716 169.849 28.696C170.715 30.676 171.125 33.0593 171.081 35.846H168.441V34.966C168.368 31.71 167.635 29.2313 166.241 27.53C164.848 25.8287 162.853 24.978 160.257 24.978C157.573 24.978 155.498 25.8653 154.031 27.64C152.579 29.4 151.853 31.8933 151.853 35.12C151.853 38.3173 152.579 40.796 154.031 42.556C155.498 44.316 157.559 45.196 160.213 45.196C162.047 45.196 163.645 44.7707 165.009 43.92C166.388 43.0547 167.481 41.8227 168.287 40.224L170.575 41.236C169.622 43.2893 168.243 44.8733 166.439 45.988C164.635 47.1027 162.575 47.66 160.257 47.66ZM150.885 35.846V33.558H169.651V35.846H150.885ZM176.212 47V21.018C176.212 20.402 176.241 19.8153 176.3 19.258C176.373 18.7007 176.513 18.1727 176.718 17.674C176.938 17.1753 177.246 16.706 177.642 16.266C178.053 15.826 178.507 15.4887 179.006 15.254C179.519 15.0193 180.062 14.8653 180.634 14.792C181.206 14.704 181.807 14.66 182.438 14.66H185.496V16.86H182.658C181.353 16.86 180.37 17.1753 179.71 17.806C179.065 18.4367 178.742 19.478 178.742 20.93V47H176.212ZM171.988 25.55V23.24H185.496V25.55H171.988ZM190.278 57.56L194.898 45.13L194.942 48.826L184.536 23.24H187.242L196.174 45.46H194.766L202.884 23.24H205.546L192.918 57.56H190.278Z" fill="url(#footer-logo-gradient)"/>
            </svg>
          </motion.div>
        </div>

        {/* Robottom Bar */}
        <div className="border-t border-white/10 py-[24px] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[14px] tracking-[-0.28px] text-white/40">
            © {new Date().getFullYear()} Leasefy. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <Link href="/privacidad" className="font-mono uppercase text-[14px] font-normal tracking-wide text-white/40 hover:text-white/60 transition-colors">
              Privacidad
            </Link>
            <Link href="/terminos" className="font-mono uppercase text-[14px] font-normal tracking-wide text-white/40 hover:text-white/60 transition-colors">
              Terminos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
