"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { List, X, User, SignOut, SquaresFour, FileText, CaretDown, House, Key, MagnifyingGlass, Bank, Medal, ShieldCheck, Wallet, PencilLine, Tray, ShieldPlus, ArrowRight, Terminal, Trophy } from '@phosphor-icons/react';
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/use-auth";
import { BrandHomeLink } from "@/components/brand/BrandHomeLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LeasefyLogo } from "@/components/brand";

/**
 * Navbar - Premium mega menu style
 */
const audienceLinks = [
  {
    href: '/para/inmobiliarias',
    label: 'Inmobiliarias',
    icon: Bank,
    description: 'Escala tu operación con tecnología e IA',
  },
  {
    href: '/para/propietarios',
    label: 'Propietarios',
    icon: Key,
    description: 'Arrienda tu propiedad sin comisiones',
  },
  {
    href: '/para/agentes',
    label: 'Agentes',
    icon: Trophy,
    description: 'Herramientas para cerrar más arriendos',
  },
  // --- Commented out for agency-only launch ---
  // {
  //   href: '/para/inquilinos',
  //   label: 'Inquilinos',
  //   icon: MagnifyingGlass,
  //   description: 'Encuentra y aplica a propiedades verificadas',
  // },
  // ---
];

const productLinks = [
  { href: '/productos/inquilino', label: 'Evaluación de inquilinos', icon: ShieldCheck, description: 'Scoring crediticio y verificación de antecedentes' },
  { href: '/productos/cobranza', label: 'Cobranza automática', icon: Wallet, description: 'Recordatorios y seguimiento de mora con IA, sin llamadas manuales' },
  { href: '/productos/crm', label: 'CRM inmobiliario', icon: FileText, description: 'Leads, visitas y cierres en un solo pipeline comercial' },
  { href: '/productos/matching', label: 'Aplicaciones online', icon: Tray, description: 'Recibe y gestiona candidatos' },
  { href: '/productos/asegurabilidad', label: 'Seguro de arrendamiento', icon: ShieldPlus, description: 'Protección hasta 24 meses ante impagos' },
  { href: '/', label: 'API para desarrolladores', icon: Terminal, description: 'Integra en tu plataforma', comingSoon: true },
];

export function Navbar() {
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isParaQuienOpen, setIsParaQuienOpen] = useState(false);
  const [isProductosOpen, setIsProductosOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, isLoading, logout, agencyRole } = useAuth();

  // Tenants and agency members with read-only roles cannot publish properties
  const canPublish = !isAuthenticated || !user || (
    user.role !== 'tenant' &&
    !(user.role === 'agency' && (agencyRole === 'CONTADOR' || agencyRole === 'VIEWER'))
  );
  const pathname = usePathname();
  const router = useRouter();

  // Check if we're on a page without a dark hero (should always show solid navbar)
  // Includes both /propiedades (listing) and /propiedades/[id] (detail pages)
  const isLightPage = pathname === '/propiedades' || pathname.startsWith('/propiedades/') || pathname === '/terminos' || pathname === '/privacidad';

  // Detect scroll to change navbar style
  useEffect(() => {
    // On light pages, always use scrolled (solid) style
    if (isLightPage) {
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      // Change navbar style after scrolling past the hero (400px)
      setIsScrolled(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLightPage]);

  // Check if a path is active
  const isActive = (path: string) => {
    if (path === '/propiedades') {
      return pathname === '/propiedades' || pathname.startsWith('/propiedades/');
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    setIsUserListOpen(false);
    setIsMobileListOpen(false);
    try {
      await logout();
    } finally {
      window.location.replace('/auth');
    }
  };

  // Get dashboard link based on user role
  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'landlord') return '/panel';
    if (user.role === 'agency') return '/panel/inmobiliaria';
    return '/inquilino';
  };

  const getDashboardLabel = () => {
    if (!user) return 'Mi panel';
    if (user.role === 'landlord') return 'Panel de propietario';
    if (user.role === 'agency') return 'Panel inmobiliaria';
    return 'Mi panel';
  };

  // Get leases link based on user role
  const getLeasesLink = () => {
    if (!user) return '/';
    if (user.role === 'landlord') return '/panel/leases';
    if (user.role === 'agency') return '/panel/inmobiliaria';
    return '/inquilino/arriendo';
  };

  const getLeasesLabel = () => {
    if (!user) return 'Mis arriendos';
    if (user.role === 'landlord') return 'Mis arriendos';
    if (user.role === 'agency') return 'Panel';
    return 'Mi arriendo';
  };

  return (
    <nav className={cn(
      "z-50 fixed top-4 left-4 right-4 md:left-[72px] md:right-[72px]"
    )}>
      {/* Navbar bar with glass effect */}
      <div className={cn(
        "rounded-xl backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-visible",
        isScrolled
          ? "bg-surface/95 border border-border"
          : "bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10"
      )}>
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
          {/* Left side - Logo + Nav Link */}
          <div className="flex items-center gap-10">
            {/* Logo */}
            <BrandHomeLink className="flex items-center" aria-label="Leasefy — inicio">
              <LeasefyLogo
                size={26}
                tone={isScrolled ? "brand" : "white"}
                className="transition-colors duration-300"
              />
            </BrandHomeLink>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              {canPublish && (
                <Button
                  variant={isActive('/publicar') ? "default" : "secondary"}
                  size="sm"
                  hideArrow
                  asChild
                  className="text-[13px]"
                >
                  <Link href="/publicar">Publicar Inmueble</Link>
                </Button>
              )}
              <Link
                href="/propiedades"
                className={cn(
                  "text-[13px] transition-colors font-medium",
                  isActive('/propiedades')
                    ? isScrolled ? "text-foreground" : "text-white"
                    : isScrolled ? "text-foreground/70 hover:text-foreground" : "text-white/70 hover:text-white"
                )}
              >
                Buscar Inmueble
              </Link>
              <Link
                href="/pricing"
                className={cn(
                  "text-[13px] transition-colors font-medium",
                  isActive('/pricing')
                    ? isScrolled ? "text-foreground" : "text-white"
                    : isScrolled ? "text-foreground/70 hover:text-foreground" : "text-white/70 hover:text-white"
                )}
              >
                Precios
              </Link>

              {/* Para quién dropdown - Minimal Style */}
              <div className="relative">
                <button
                  onClick={() => { setIsParaQuienOpen(!isParaQuienOpen); setIsProductosOpen(false); }}
                  className={cn(
                    "flex items-center gap-1 text-[13px] transition-colors font-medium",
                    isActive('/para') || isParaQuienOpen
                      ? isScrolled ? "text-foreground" : "text-white"
                      : isScrolled ? "text-foreground/70 hover:text-foreground" : "text-white/70 hover:text-white"
                  )}
                  aria-expanded={isParaQuienOpen}
                  aria-haspopup="true"
                >
                  Para quién
                  <CaretDown className={`w-3.5 h-3.5 transition-transform ${isParaQuienOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Productos dropdown - Minimal Style */}
              <div className="relative">
                <button
                  onClick={() => { setIsProductosOpen(!isProductosOpen); setIsParaQuienOpen(false); }}
                  className={cn(
                    "flex items-center gap-1 text-[13px] transition-colors font-medium",
                    isActive('/productos') || isProductosOpen
                      ? isScrolled ? "text-foreground" : "text-white"
                      : isScrolled ? "text-foreground/70 hover:text-foreground" : "text-white/70 hover:text-white"
                  )}
                  aria-expanded={isProductosOpen}
                  aria-haspopup="true"
                >
                  Productos
                  <CaretDown className={`w-3.5 h-3.5 transition-transform ${isProductosOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Right side - Auth Links or User List */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <div className={cn(
                "w-8 h-8 rounded-full animate-pulse transition-colors",
                isScrolled ? "bg-foreground/10" : "bg-white/20"
              )} />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserListOpen(!isUserListOpen)}
                  className={cn(
                    "flex items-center gap-2 text-sm transition-colors",
                    isScrolled ? "text-foreground/80 hover:text-foreground" : "text-white/80 hover:text-white"
                  )}
                  aria-expanded={isUserListOpen}
                  aria-haspopup="true"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    isScrolled ? "bg-foreground/10" : "bg-white/20"
                  )}>
                    <User className={cn("w-4 h-4 transition-colors", isScrolled ? "text-foreground/70" : "text-white/70")} />
                  </div>
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  <CaretDown className={`w-4 h-4 transition-transform ${isUserListOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                <AnimatePresence>
                  {isUserListOpen && (
                    <>
                      {/* Backdrop to close menu */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUserListOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl z-50 origin-top-right shadow-[0_12px_36px_rgba(20,19,15,0.14)]"
                      >
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-medium text-fg">{user.name}</p>
                          <p className="text-xs text-fg-muted truncate">{user.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-mono bg-surface-muted rounded-full text-fg-muted">
                            {user.role === 'landlord' ? 'Propietario' : user.role === 'agency' ? 'Inmobiliaria' : 'Inquilino'}
                          </span>
                        </div>

                        {/* List items */}
                        <div className="py-1">
                          <Link
                            href={getDashboardLink()}
                            onClick={() => setIsUserListOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-surface-muted transition-colors"
                          >
                            {user.role === 'landlord' ? (
                              <SquaresFour className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                            {getDashboardLabel()}
                          </Link>
                          <Link
                            href={getLeasesLink()}
                            onClick={() => setIsUserListOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-surface-muted transition-colors"
                          >
                            <House className="w-4 h-4" />
                            {getLeasesLabel()}
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-surface-muted transition-colors"
                          >
                            <SignOut className="w-4 h-4" />
                            Cerrar sesion
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Button variant={isScrolled ? "ghost" : "white"} size="sm" hideArrow asChild>
                  <Link href="/auth">Iniciar sesion</Link>
                </Button>
                <Button variant={isScrolled ? "default" : "default"} size="sm" asChild>
                  <Link href="/auth?mode=register">Registrarme</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile List Button */}
          <button
            onClick={() => setIsMobileListOpen(!isMobileListOpen)}
            className={cn(
              "md:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center transition-colors",
              isScrolled ? "text-foreground" : "text-white"
            )}
            aria-label={isMobileListOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={isMobileListOpen}
            aria-controls="mobile-menu"
          >
            {isMobileListOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <List className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      </div>

      {/* Mega Lists - positioned below navbar bar */}
      <AnimatePresence>
        {isParaQuienOpen && (
          <>
            {/* Full-screen backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsParaQuienOpen(false)}
            />
            {/* Para quién mega menu - Glass effect */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-0 right-0 top-[calc(100%+4px)] bg-black/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] z-50 overflow-hidden"
            >
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-[13px] font-medium text-white tracking-tight">Para quién es Leasefy</h3>
                    <p className="text-[12px] text-white/60 mt-0.5">Soluciones para cada actor del ecosistema inmobiliario</p>
                  </div>
                  <Link
                    href="/pricing"
                    onClick={() => setIsParaQuienOpen(false)}
                    className="text-[12px] text-white/60 hover:text-white transition-colors flex items-center gap-1"
                  >
                    Comparar planes
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* 4-column grid for audiences */}
                <div className="grid grid-cols-4 gap-6">
                  {audienceLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsParaQuienOpen(false)}
                        className="group p-4 rounded-xl border border-transparent hover:border-white/20 hover:bg-white/10 transition-all duration-200"
                      >
                        {/* Icon container */}
                        <div className="w-11 h-11 rounded-md bg-white/10 flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
                          <Icon className="w-5 h-5 text-white/60 group-hover:text-white/80 transition-colors" strokeWidth={1.5} />
                        </div>

                        {/* Content */}
                        <h4 className="text-[14px] font-medium text-white mb-1.5 group-hover:text-white transition-colors">
                          {item.label}
                        </h4>
                        <p className="text-[12px] text-white/60 leading-relaxed mb-3">
                          {item.description}
                        </p>

                        {/* Learn more link */}
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/50 group-hover:text-white/70 transition-colors">
                          Conocer más
                          <ArrowRight className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Footer with CTA */}
              <div className="px-8 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
                <a
                  href="https://wa.me/573116558833"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-white/50 hover:text-white/70 transition-colors"
                >
                  ¿No sabes cuál elegir? <span className="text-white/70 underline underline-offset-2">Habla con nuestro equipo</span>
                </a>
                {canPublish && (
                  <Link
                    href="/publicar"
                    onClick={() => setIsParaQuienOpen(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-white bg-white/15 border border-white/20 rounded-xl hover:bg-white/25 transition-colors"
                  >
                    Comenzar gratis
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProductosOpen && (
          <>
            {/* Full-screen backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsProductosOpen(false)}
            />
            {/* Productos mega menu - Glass effect */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-0 right-0 top-[calc(100%+4px)] bg-black/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] z-50 overflow-hidden"
            >
              <div className="flex">
                {/* Main products grid - Left side */}
                <div className="flex-1 p-8">
                  {/* Header */}
                  <div className="mb-6 pb-4 border-b border-white/10">
                    <h3 className="text-[13px] font-medium text-white tracking-tight">Productos</h3>
                    <p className="text-[12px] text-white/60 mt-0.5">Herramientas integradas para todo el ciclo de arriendo</p>
                  </div>

                  {/* 3-column grid for products */}
                  <div className="grid grid-cols-3 gap-4">
                    {productLinks.map((item) => {
                      const Icon = item.icon;
                      const isComingSoon = 'comingSoon' in item && item.comingSoon;

                      if (isComingSoon) {
                        return (
                          <div
                            key={item.href}
                            className="p-4 rounded-xl border border-white/10 bg-white/5 opacity-70 cursor-not-allowed"
                          >
                            {/* Icon container */}
                            <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center mb-3">
                              <Icon className="w-[18px] h-[18px] text-white/40" strokeWidth={1.5} />
                            </div>

                            {/* Content */}
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-[13px] font-medium text-white/60">
                                {item.label}
                              </h4>
                              <span className="px-1.5 py-0.5 text-[9px] font-medium bg-white/20 text-white/80 rounded-full">
                                Próximamente
                              </span>
                            </div>
                            <p className="text-[11px] text-white/40 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsProductosOpen(false)}
                          className="group p-4 rounded-xl border border-transparent hover:border-white/20 hover:bg-white/10 transition-all duration-200"
                        >
                          {/* Icon container */}
                          <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
                            <Icon className="w-[18px] h-[18px] text-white/60 group-hover:text-white/80 transition-colors" strokeWidth={1.5} />
                          </div>

                          {/* Content */}
                          <h4 className="text-[13px] font-medium text-white mb-1 group-hover:text-white transition-colors">
                            {item.label}
                          </h4>
                          <p className="text-[11px] text-white/60 leading-relaxed">
                            {item.description}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Right sidebar - Featured/CTA */}
                <div className="w-[280px] bg-white/5 border-l border-white/10 p-6 flex flex-col">
                  {/* Featured product highlight */}
                  <div className="mb-6">
                    <span className="inline-block text-[10px] font-medium text-white/50 uppercase tracking-wider mb-3">Destacado</span>
                    <div className="p-4 bg-white/10 rounded-xl border border-white/10">
                      <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center mb-3">
                        <ShieldCheck className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                      </div>
                      <h4 className="text-[13px] font-medium text-white mb-1">Evaluación gratuita</h4>
                      <p className="text-[11px] text-white/60 leading-relaxed mb-3">
                        Verifica inquilinos sin costo. El solicitante paga la verificación.
                      </p>
                      <Link
                        href="/productos/inquilino"
                        onClick={() => setIsProductosOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] text-white/70 hover:text-white transition-colors"
                      >
                        Conocer más
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Quick links */}
                  <div className="space-y-2 mt-auto">
                    <Link
                      href="/pricing"
                      onClick={() => setIsProductosOpen(false)}
                      className="flex items-center justify-between py-2 text-[12px] text-white/60 hover:text-white transition-colors"
                    >
                      Ver precios
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Link
                      href="/pricing#faq"
                      onClick={() => setIsProductosOpen(false)}
                      className="flex items-center justify-between py-2 text-[12px] text-white/60 hover:text-white transition-colors"
                    >
                      Preguntas frecuentes
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
                <p className="text-[12px] text-white/50">
                  Todos los productos se integran automáticamente
                </p>
                {canPublish && (
                  <Link
                    href="/publicar"
                    onClick={() => setIsProductosOpen(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-white bg-white/15 border border-white/20 rounded-xl hover:bg-white/25 transition-colors"
                  >
                    Comenzar ahora
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile List */}
      <AnimatePresence>
        {isMobileListOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="md:hidden bg-surface border-t border-border overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="px-6 py-4 space-y-1"
            >
              {canPublish && (
                <Link
                  href="/publicar"
                  className={cn(
                    "block min-h-[44px] py-3 text-sm font-medium transition-colors flex items-center",
                    isActive('/publicar') ? "text-foreground" : "text-foreground/70 hover:text-foreground"
                  )}
                  onClick={() => setIsMobileListOpen(false)}
                >
                  Publicar Inmueble
                  {isActive('/publicar') && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-primary" />}
                </Link>
              )}
              <Link
                href="/propiedades"
                className={cn(
                  "block min-h-[44px] py-3 text-sm transition-colors flex items-center",
                  isActive('/propiedades') ? "text-foreground font-medium" : "text-foreground/70 hover:text-foreground"
                )}
                onClick={() => setIsMobileListOpen(false)}
              >
                Buscar Inmueble
                {isActive('/propiedades') && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-primary" />}
              </Link>
              <Link
                href="/pricing"
                className={cn(
                  "block min-h-[44px] py-3 text-sm transition-colors flex items-center",
                  isActive('/pricing') ? "text-foreground font-medium" : "text-foreground/70 hover:text-foreground"
                )}
                onClick={() => setIsMobileListOpen(false)}
              >
                Precios
                {isActive('/pricing') && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-primary" />}
              </Link>

              {/* Para quién - Mobile */}
              <div className="pt-2 mt-2 border-t border-border">
                <p className="text-xs font-medium text-fg-muted uppercase tracking-wide py-2">Para quién</p>
                {audienceLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 min-h-[44px] py-3 text-sm transition-colors",
                        isActive(item.href) ? "text-foreground font-medium" : "text-foreground/70 hover:text-foreground"
                      )}
                      onClick={() => setIsMobileListOpen(false)}
                    >
                      <div className="w-7 h-7 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-foreground/60" strokeWidth={1.5} />
                      </div>
                      {item.label}
                      {isActive(item.href) && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                    </Link>
                  );
                })}
              </div>

              {/* Productos - Mobile */}
              <div className="pt-2 mt-2 border-t border-border">
                <p className="text-xs font-medium text-fg-muted uppercase tracking-wide py-2">Productos</p>
                {productLinks.map((item) => {
                  const Icon = item.icon;
                  const isComingSoon = 'comingSoon' in item && item.comingSoon;

                  if (isComingSoon) {
                    return (
                      <div
                        key={item.href}
                        className="flex items-center gap-3 min-h-[44px] py-3 text-sm text-foreground/40 cursor-not-allowed"
                      >
                        <div className="w-7 h-7 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-foreground/30" strokeWidth={1.5} />
                        </div>
                        {item.label}
                        <span className="ml-auto px-1.5 py-0.5 text-[9px] font-medium bg-foreground/10 text-foreground/50 rounded-full">
                          Próximamente
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 min-h-[44px] py-3 text-sm transition-colors",
                        isActive(item.href) ? "text-foreground font-medium" : "text-foreground/70 hover:text-foreground"
                      )}
                      onClick={() => setIsMobileListOpen(false)}
                    >
                      <div className="w-7 h-7 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-foreground/60" strokeWidth={1.5} />
                      </div>
                      {item.label}
                      {isActive(item.href) && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                    </Link>
                  );
                })}
              </div>

              {isAuthenticated && user ? (
                <>
                  {/* User info */}
                  <div className="pt-3 mt-3 border-t border-border">
                    <div className="flex items-center gap-3 py-3">
                      <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-fg-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-fg-muted">{user.role === 'landlord' ? 'Propietario' : user.role === 'agency' ? 'Inmobiliaria' : 'Inquilino'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard link */}
                  <Link
                    href={getDashboardLink()}
                    className="flex items-center gap-3 min-h-[44px] py-3 text-sm text-foreground/70 hover:text-foreground transition-colors"
                    onClick={() => setIsMobileListOpen(false)}
                  >
                    {user.role === 'landlord' ? (
                      <SquaresFour className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {getDashboardLabel()}
                  </Link>

                  {/* Leases link */}
                  <Link
                    href={getLeasesLink()}
                    className="flex items-center gap-3 min-h-[44px] py-3 text-sm text-foreground/70 hover:text-foreground transition-colors"
                    onClick={() => setIsMobileListOpen(false)}
                  >
                    <House className="w-4 h-4" />
                    {getLeasesLabel()}
                  </Link>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full min-h-[44px] py-3 text-sm text-foreground/70 hover:text-foreground transition-colors"
                  >
                    <SignOut className="w-4 h-4" />
                    Cerrar sesion
                  </button>
                </>
              ) : (
                <div className="pt-3 mt-3 border-t border-border space-y-1">
                  <Link
                    href="/auth"
                    className="block min-h-[44px] py-3 text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center"
                    onClick={() => setIsMobileListOpen(false)}
                  >
                    Iniciar sesion
                  </Link>
                  <Link
                    href="/auth?mode=register"
                    className="block min-h-[44px] py-3 text-sm font-medium text-foreground hover:text-foreground/70 transition-colors flex items-center"
                    onClick={() => setIsMobileListOpen(false)}
                  >
                    Registrarme
                  </Link>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
