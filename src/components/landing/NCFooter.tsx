import Link from "next/link";
import { LinkedinLogo, XLogo, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { MonoLabel } from "@leasefy/cadence";
import { LeasefyLogo } from "@/components/brand";

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };

const COLUMNS: FooterColumn[] = [
  {
    title: "Plataforma",
    links: [
      { label: "CRM inmobiliario", href: "#plataforma" },
      { label: "ERP de arriendos", href: "#plataforma" },
      { label: "Agentes AI", href: "#agentes" },
      { label: "Asegurabilidad", href: "#agentes" },
    ],
  },
  {
    title: "Agentes",
    links: [
      { label: "Cobranza", href: "#agentes" },
      { label: "Matching", href: "#agentes" },
      { label: "Estudio de inquilino", href: "#agentes" },
      { label: "Conciliación", href: "#agentes" },
      { label: "Avalúos", href: "#agentes" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Planes", href: "#planes" },
      { label: "Preguntas frecuentes", href: "#faq" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Compañía",
    links: [
      { label: "Sobre nosotros", href: "/about" },
      { label: "Seguridad", href: "#seguridad" },
      { label: "Privacidad", href: "/privacidad" },
      { label: "Términos", href: "/terminos" },
    ],
  },
];

const SOCIALS = [
  { Icon: LinkedinLogo, href: "https://www.linkedin.com/company/leasefy", label: "LinkedIn" },
  { Icon: XLogo, href: "https://x.com/leasefy", label: "X" },
  { Icon: WhatsappLogo, href: "https://wa.me/573000000000", label: "WhatsApp" },
];

export default function NCFooter() {
  return (
    <footer className="border-t border-border bg-surface py-16 md:py-20">
      <div className="container-platform">
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-8">
          {/* LEFT — badges + socials */}
          <div className="lg:col-span-1">
            <div className="flex flex-col gap-3">
              <MonoLabel className="w-fit rounded-xl border border-border p-4 text-[12px] tracking-wide text-fg-muted">
                Hecho en Colombia 🇨🇴
              </MonoLabel>
              <MonoLabel className="w-fit rounded-xl border border-border p-4 text-[12px] tracking-wide text-fg-muted">
                Habeas Data · Ley 1581
              </MonoLabel>
            </div>

            <div className="mt-8 flex items-center gap-3">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:text-fg"
                >
                  <Icon className="h-[18px] w-[18px]" weight="regular" />
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT — link columns */}
          <div className="lg:col-span-4">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {COLUMNS.map((col) => (
                <div key={col.title}>
                  <MonoLabel className="block text-[12px] tracking-[0.08em] text-fg">
                    {col.title}
                  </MonoLabel>
                  <ul className="mt-5 space-y-3">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="text-[15px] text-fg-muted transition-colors hover:text-fg"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                    {col.title === "Compañía" && (
                      <>
                        <li className="pt-1 text-[15px] text-fg-muted">hola@leasefy.co</li>
                        <li className="text-[15px] text-fg-muted">ventas@leasefy.co</li>
                      </>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-16 flex items-center justify-between border-t border-border pt-8">
          <span className="text-[13px] text-fg-subtle">© 2026 Leasefy</span>
          <LeasefyLogo size={22} />
        </div>
      </div>
    </footer>
  );
}
