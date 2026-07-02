"use client";

import Link from "next/link";
import { MonoLabel } from "@leasefy/cadence";
import { LeasefyLogo } from "@/components/brand";
import { Reveal } from "./_kit";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Plataforma",
    links: [
      { label: "CRM inmobiliario", href: "#plataforma" },
      { label: "ERP de arriendos", href: "#plataforma" },
      { label: "Agentes AI", href: "#agentes" },
      { label: "Asegurabilidad", href: "#agentes" },
      { label: "Avalúos", href: "#agentes" },
    ],
  },
  {
    title: "Útil",
    links: [
      { label: "Planes", href: "#planes" },
      { label: "Para inmobiliarias", href: "/para/inmobiliarias" },
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Blog", href: "/blog" },
      { label: "Preguntas frecuentes", href: "#faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidad", href: "/privacidad" },
      { label: "Términos", href: "/terminos" },
      { label: "Habeas Data", href: "/privacidad" },
      { label: "ARCO", href: "/arco" },
    ],
  },
  {
    title: "Social",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/company/leasefy" },
      { label: "Instagram", href: "https://www.instagram.com/leasefy" },
      { label: "X", href: "https://x.com/leasefy" },
      { label: "WhatsApp", href: "https://wa.me/573116558833" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white py-16 md:py-20">
      <div className="container-platform">
        <Reveal>
          <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-3 lg:grid-cols-5">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-1">
              <LeasefyLogo size={26} tone="brand" />
              <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-neutral-500">
                Construyendo el sistema operativo inteligente para las
                inmobiliarias de Colombia.
              </p>
            </div>

            {COLS.map((col) => (
              <div key={col.title}>
                <MonoLabel className="block text-[12px] tracking-[0.08em] text-neutral-950">
                  {col.title}
                </MonoLabel>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-[15px] leading-relaxed text-neutral-500 transition-colors hover:text-neutral-950"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Bottom row — hairline divider, © + provenance */}
        <div className="mt-16 flex flex-col gap-3 border-t border-neutral-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-neutral-400">
            © 2026 Leasefy. Todos los derechos reservados.
          </p>
          <p className="text-[13px] text-neutral-400">Hecho en Colombia 🇨🇴</p>
        </div>
      </div>
    </footer>
  );
}
