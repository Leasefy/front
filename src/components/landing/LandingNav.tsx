"use client";

import Link from "next/link";
import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { LeasefyLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { LpButton } from "./_kit";

const NAV_LINKS = [
  { label: "Plataforma", href: "#plataforma" },
  { label: "Agentes", href: "#agentes" },
  { label: "Comparar", href: "#comparar" },
  { label: "Contacto", href: "#contacto" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-white/85 backdrop-blur-md">
      <div className="container-platform">
        <div className="relative flex h-[64px] items-center justify-between">
          {/* Logo */}
          <Link href="/landing-nueva" aria-label="Leasefy — inicio" className="flex items-center">
            <LeasefyLogo size={25} tone="brand" />
          </Link>

          {/* Center links — mono uppercase (NewsCatcher) */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 lg:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-mono text-[12px] uppercase tracking-[0.1em] text-neutral-950 transition-colors hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right: lang + CTAs */}
          <div className="hidden items-center gap-4 lg:flex">
            <div className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.06em] text-neutral-400">
              <button className="text-neutral-950">ES</button>
              <span>/</span>
              <button className="hover:text-neutral-700">EN</button>
            </div>
            <LpButton href="/auth?mode=login" variant="light" size="default">
              Ingresar
            </LpButton>
            <LpButton href="/auth?mode=register" variant="primary" size="default">
              Empezar ahora
            </LpButton>
          </div>

          {/* Mobile toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen((v) => !v)}
            className="h-11 w-11 lg:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
          >
            {open ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-neutral-200 bg-white lg:hidden">
          <div className="container-platform flex flex-col gap-1 py-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2.5 font-mono text-[13px] uppercase tracking-[0.08em] text-neutral-700"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-neutral-200 pt-4">
              <LpButton href="/auth?mode=register" variant="primary" className="w-full">
                Contáctanos
              </LpButton>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
