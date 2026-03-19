"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { List, X, User, SignOut, SquaresFour, FileText, CaretDown, House, Key, MagnifyingGlass, Bank, Medal, ShieldCheck, Wallet, PencilLine, Tray, ShieldPlus, ArrowRight, Terminal, Trophy } from '@phosphor-icons/react';
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Navbar - Premium mega menu style
 */
const audienceLinks = [
  {
    href: '/para/propietarios',
    label: 'Propietarios',
    icon: Key,
    description: 'Arrienda tu propiedad sin comisiones de intermediación',
  },
  {
    href: '/para/inquilinos',
    label: 'Inquilinos',
    icon: MagnifyingGlass,
    description: 'Encuentra y aplica a propiedades verificadas',
  },
  {
    href: '/para/inmobiliarias',
    label: 'Inmobiliarias',
    icon: Bank,
    description: 'Escala tu operación con tecnología',
  },
  {
    href: '/para/agentes',
    label: 'Agentes',
    icon: Trophy,
    description: 'Herramientas para cerrar más arriendos',
  },
];

const productLinks = [
  { href: '/productos/evaluacion', label: 'Evaluación de inquilinos', icon: ShieldCheck, description: 'Scoring crediticio y verificación de antecedentes' },
  { href: '/productos/pagos', label: 'Pagos y recaudo', icon: Wallet, description: 'PSE, tarjeta y efectivo con transferencia automática' },
  { href: '/productos/contratos', label: 'Contratos digitales', icon: FileText, description: 'Firma electrónica con validez legal' },
  { href: '/productos/aplicaciones', label: 'Aplicaciones online', icon: Tray, description: 'Recibe y gestiona candidatos' },
  { href: '/productos/seguro', label: 'Seguro de arrendamiento', icon: ShieldPlus, description: 'Protección hasta 24 meses ante impagos' },
  { href: '/productos/api', label: 'API para desarrolladores', icon: Terminal, description: 'Integra en tu plataforma', comingSoon: true },
];

export function Navbar() {
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isParaQuienOpen, setIsParaQuienOpen] = useState(false);
  const [isProductosOpen, setIsProductosOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Check if we're on a page without a dark hero (should always show solid navbar)
  // Includes both /propiedades (listing) and /propiedades/[id] (detail pages)
  const isLightPage = pathname === '/propiedades' || pathname.startsWith('/propiedades/');

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
    try {
      await logout();
    } catch (err) {
      console.error('[Navbar] Logout error:', err);
    }
    setIsUserListOpen(false);
    setIsMobileListOpen(false);
    router.push('/auth');
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

  const isTenant = isAuthenticated && user?.role === 'tenant';

  // Get leases link based on user role
  const getLeasesLink = () => {
    if (!user) return '/';
    return user.role === 'landlord' ? '/panel/leases' : '/inquilino/arriendo';
  };

  const getLeasesLabel = () => {
    if (!user) return 'Mis arriendos';
    return user.role === 'landlord' ? 'Mis arriendos' : 'Mi arriendo';
  };

  return (
    <nav className={cn(
      "z-[200] fixed top-4 left-4 right-4 md:left-[72px] md:right-[72px]"
    )}>
      {/* Navbar bar with glass effect */}
      <div className={cn(
        "rounded-2xl backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-visible",
        isScrolled
          ? "bg-white/95 border border-border"
          : "bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10"
      )}>
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
          {/* Left side - Logo + Nav Link */}
          <div className="flex items-center gap-10">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              {/* Leasefy logo with text */}
              <svg
                viewBox="0 0 207 60"
                className={cn("h-7 w-auto transition-colors duration-300", isScrolled ? "text-foreground" : "text-white")}
                fill="none"
              >
                <path d="M5 51L29 27L47 45V15" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M65.52 47V15.32H68.05V44.536H83.45V47H65.52ZM94.7989 47.66C92.5256 47.66 90.5602 47.154 88.9029 46.142C87.2456 45.1153 85.9622 43.6707 85.0529 41.808C84.1436 39.9307 83.6889 37.716 83.6889 35.164C83.6889 32.568 84.1362 30.3313 85.0309 28.454C85.9402 26.562 87.2162 25.11 88.8589 24.098C90.5162 23.086 92.4816 22.58 94.7549 22.58C97.0576 22.58 99.0229 23.108 100.651 24.164C102.294 25.2053 103.54 26.716 104.391 28.696C105.256 30.676 105.667 33.0593 105.623 35.846H102.983V34.966C102.91 31.71 102.176 29.2313 100.783 27.53C99.3896 25.8287 97.3949 24.978 94.7989 24.978C92.1149 24.978 90.0396 25.8653 88.5729 27.64C87.1209 29.4 86.3949 31.8933 86.3949 35.12C86.3949 38.3173 87.1209 40.796 88.5729 42.556C90.0396 44.316 92.1002 45.196 94.7549 45.196C96.5882 45.196 98.1869 44.7707 99.5509 43.92C100.93 43.0547 102.022 41.8227 102.829 40.224L105.117 41.236C104.164 43.2893 102.785 44.8733 100.981 45.988C99.1769 47.1027 97.1162 47.66 94.7989 47.66ZM85.4269 35.846V33.558H104.193V35.846H85.4269ZM114.724 47.66C112.89 47.66 111.365 47.3373 110.148 46.692C108.945 46.0467 108.043 45.196 107.442 44.14C106.84 43.0693 106.54 41.9107 106.54 40.664C106.54 39.3147 106.818 38.1853 107.376 37.276C107.948 36.3667 108.703 35.6333 109.642 35.076C110.595 34.5187 111.644 34.1007 112.788 33.822C114.093 33.5287 115.501 33.2793 117.012 33.074C118.522 32.854 119.96 32.6633 121.324 32.502C122.702 32.3407 123.824 32.2013 124.69 32.084L123.766 32.634C123.824 30.0673 123.34 28.1607 122.314 26.914C121.302 25.6527 119.512 25.022 116.946 25.022C115.142 25.022 113.653 25.4327 112.48 26.254C111.321 27.0607 110.507 28.3147 110.038 30.016L107.442 29.29C107.984 27.134 109.077 25.4767 110.72 24.318C112.362 23.1593 114.467 22.58 117.034 22.58C119.219 22.58 121.052 23.0053 122.534 23.856C124.03 24.7067 125.071 25.902 125.658 27.442C125.907 28.0727 126.076 28.8133 126.164 29.664C126.252 30.5 126.296 31.3433 126.296 32.194V47H123.986V40.752L124.844 40.972C124.125 43.1133 122.871 44.7633 121.082 45.922C119.292 47.0807 117.173 47.66 114.724 47.66ZM114.856 45.328C116.469 45.328 117.884 45.042 119.102 44.47C120.319 43.8833 121.302 43.0693 122.05 42.028C122.812 40.972 123.296 39.7327 123.502 38.31C123.648 37.518 123.729 36.66 123.744 35.736C123.758 34.812 123.766 34.13 123.766 33.69L124.866 34.394C123.912 34.5113 122.768 34.636 121.434 34.768C120.114 34.9 118.764 35.0613 117.386 35.252C116.007 35.4427 114.76 35.6847 113.646 35.978C112.956 36.1687 112.26 36.4473 111.556 36.814C110.866 37.166 110.287 37.6573 109.818 38.288C109.363 38.9187 109.136 39.718 109.136 40.686C109.136 41.4047 109.312 42.1233 109.664 42.842C110.03 43.5607 110.632 44.1547 111.468 44.624C112.304 45.0933 113.433 45.328 114.856 45.328ZM138.586 47.616C135.843 47.616 133.577 47.0367 131.788 45.878C130.013 44.7193 128.913 43.106 128.488 41.038L131.084 40.598C131.451 42.006 132.316 43.128 133.68 43.964C135.044 44.8 136.716 45.218 138.696 45.218C140.661 45.218 142.223 44.8 143.382 43.964C144.541 43.128 145.12 41.984 145.12 40.532C145.12 39.74 144.937 39.0947 144.57 38.596C144.218 38.0827 143.514 37.6133 142.458 37.188C141.402 36.7627 139.833 36.264 137.75 35.692C135.55 35.1053 133.827 34.5187 132.58 33.932C131.348 33.3453 130.475 32.678 129.962 31.93C129.463 31.182 129.214 30.2653 129.214 29.18C129.214 27.8747 129.588 26.7307 130.336 25.748C131.084 24.7507 132.125 23.9733 133.46 23.416C134.809 22.8587 136.364 22.58 138.124 22.58C139.884 22.58 141.468 22.8733 142.876 23.46C144.284 24.032 145.421 24.8387 146.286 25.88C147.151 26.9067 147.65 28.102 147.782 29.466L145.186 29.95C144.937 28.4247 144.167 27.222 142.876 26.342C141.585 25.4473 139.972 24.9927 138.036 24.978C136.203 24.9487 134.707 25.3153 133.548 26.078C132.389 26.826 131.81 27.816 131.81 29.048C131.81 29.752 132.008 30.3533 132.404 30.852C132.815 31.336 133.533 31.7833 134.56 32.194C135.587 32.6047 137.039 33.0447 138.916 33.514C141.204 34.1007 142.986 34.702 144.262 35.318C145.553 35.934 146.462 36.66 146.99 37.496C147.518 38.3173 147.782 39.3367 147.782 40.554C147.782 42.754 146.961 44.4847 145.318 45.746C143.69 46.9927 141.446 47.616 138.586 47.616ZM160.257 47.66C157.984 47.66 156.019 47.154 154.361 46.142C152.704 45.1153 151.421 43.6707 150.511 41.808C149.602 39.9307 149.147 37.716 149.147 35.164C149.147 32.568 149.595 30.3313 150.489 28.454C151.399 26.562 152.675 25.11 154.317 24.098C155.975 23.086 157.94 22.58 160.213 22.58C162.516 22.58 164.481 23.108 166.109 24.164C167.752 25.2053 168.999 26.716 169.849 28.696C170.715 30.676 171.125 33.0593 171.081 35.846H168.441V34.966C168.368 31.71 167.635 29.2313 166.241 27.53C164.848 25.8287 162.853 24.978 160.257 24.978C157.573 24.978 155.498 25.8653 154.031 27.64C152.579 29.4 151.853 31.8933 151.853 35.12C151.853 38.3173 152.579 40.796 154.031 42.556C155.498 44.316 157.559 45.196 160.213 45.196C162.047 45.196 163.645 44.7707 165.009 43.92C166.388 43.0547 167.481 41.8227 168.287 40.224L170.575 41.236C169.622 43.2893 168.243 44.8733 166.439 45.988C164.635 47.1027 162.575 47.66 160.257 47.66ZM150.885 35.846V33.558H169.651V35.846H150.885ZM176.212 47V21.018C176.212 20.402 176.241 19.8153 176.3 19.258C176.373 18.7007 176.513 18.1727 176.718 17.674C176.938 17.1753 177.246 16.706 177.642 16.266C178.053 15.826 178.507 15.4887 179.006 15.254C179.519 15.0193 180.062 14.8653 180.634 14.792C181.206 14.704 181.807 14.66 182.438 14.66H185.496V16.86H182.658C181.353 16.86 180.37 17.1753 179.71 17.806C179.065 18.4367 178.742 19.478 178.742 20.93V47H176.212ZM171.988 25.55V23.24H185.496V25.55H171.988ZM190.278 57.56L194.898 45.13L194.942 48.826L184.536 23.24H187.242L196.174 45.46H194.766L202.884 23.24H205.546L192.918 57.56H190.278Z" fill="currentColor"/>
              </svg>
            </Link>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              {!isTenant && (
                <Button
                  variant={isActive('/publicar') ? "default" : "secondary"}
                  size="sm"
                  hideArrow
                  asChild
                  className="font-mono text-[13px] uppercase tracking-wide"
                >
                  <Link href="/publicar">Publicar Inmueble</Link>
                </Button>
              )}
              <Link
                href="/propiedades"
                className={cn(
                  "font-mono text-[13px] uppercase tracking-wide transition-colors",
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
                  "font-mono text-[13px] uppercase tracking-wide transition-colors",
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
                    "flex items-center gap-1 font-mono text-[13px] uppercase tracking-wide transition-colors",
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
                    "flex items-center gap-1 font-mono text-[13px] uppercase tracking-wide transition-colors",
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
                        className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-card border border-border dark:border-border rounded-xl shadow-lg z-50 origin-top-right"
                      >
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-black/5 rounded-full text-muted-foreground">
                            {user.role === 'landlord' ? 'Propietario' : user.role === 'agency' ? 'Inmobiliaria' : 'Inquilino'}
                          </span>
                        </div>

                        {/* List items */}
                        <div className="py-1">
                          <Link
                            href={getDashboardLink()}
                            onClick={() => setIsUserListOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-black/5 transition-colors"
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
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-black/5 transition-colors"
                          >
                            <House className="w-4 h-4" />
                            {getLeasesLabel()}
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-black/5 transition-colors"
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
              className="absolute left-0 right-0 top-[calc(100%+4px)] bg-black/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] z-50 overflow-hidden"
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
                        <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
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
                <p className="text-[12px] text-white/50">
                  ¿No sabes cuál elegir? <span className="text-white/70">Habla con nuestro equipo</span>
                </p>
                {isTenant ? (
                  <button
                    onClick={() => { setIsParaQuienOpen(false); handleLogout(); }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-white bg-white/15 border border-white/20 rounded-xl hover:bg-white/25 transition-colors"
                  >
                    Cerrar sesión
                    <SignOut className="w-3 h-3" />
                  </button>
                ) : (
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
              className="absolute left-0 right-0 top-[calc(100%+4px)] bg-black/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] z-50 overflow-hidden"
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
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-3">
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
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
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
                      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                        <ShieldCheck className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                      </div>
                      <h4 className="text-[13px] font-medium text-white mb-1">Evaluación gratuita</h4>
                      <p className="text-[11px] text-white/60 leading-relaxed mb-3">
                        Verifica inquilinos sin costo. El solicitante paga la verificación.
                      </p>
                      <Link
                        href="/productos/evaluacion"
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
                {isTenant ? (
                  <button
                    onClick={() => { setIsProductosOpen(false); handleLogout(); }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-white bg-white/15 border border-white/20 rounded-xl hover:bg-white/25 transition-colors"
                  >
                    Cerrar sesión
                    <SignOut className="w-3 h-3" />
                  </button>
                ) : (
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
            className="md:hidden bg-white dark:bg-card border-t border-border dark:border-border overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="px-6 py-4 space-y-1"
            >
              {!isTenant && (
                <Link
                  href="/publicar"
                  className={cn(
                    "block min-h-[44px] py-3 text-sm font-medium transition-colors flex items-center",
                    isActive('/publicar') ? "text-foreground" : "text-foreground/70 hover:text-foreground"
                  )}
                  onClick={() => setIsMobileListOpen(false)}
                >
                  Publicar Inmueble
                  {isActive('/publicar') && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-black" />}
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
                {isActive('/propiedades') && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-black" />}
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
                {isActive('/pricing') && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-black" />}
              </Link>

              {/* Para quién - Mobile */}
              <div className="pt-2 mt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-2">Para quién</p>
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
                      <div className="w-7 h-7 rounded-xl bg-black/[0.04] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-foreground/60" strokeWidth={1.5} />
                      </div>
                      {item.label}
                      {isActive(item.href) && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-black" />}
                    </Link>
                  );
                })}
              </div>

              {/* Productos - Mobile */}
              <div className="pt-2 mt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-2">Productos</p>
                {productLinks.map((item) => {
                  const Icon = item.icon;
                  const isComingSoon = 'comingSoon' in item && item.comingSoon;

                  if (isComingSoon) {
                    return (
                      <div
                        key={item.href}
                        className="flex items-center gap-3 min-h-[44px] py-3 text-sm text-foreground/40 cursor-not-allowed"
                      >
                        <div className="w-7 h-7 rounded-xl bg-black/[0.04] flex items-center justify-center flex-shrink-0">
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
                      <div className="w-7 h-7 rounded-xl bg-black/[0.04] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-foreground/60" strokeWidth={1.5} />
                      </div>
                      {item.label}
                      {isActive(item.href) && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-black" />}
                    </Link>
                  );
                })}
              </div>

              {isAuthenticated && user ? (
                <>
                  {/* User info */}
                  <div className="pt-3 mt-3 border-t border-border">
                    <div className="flex items-center gap-3 py-3">
                      <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.role === 'landlord' ? 'Propietario' : user.role === 'agency' ? 'Inmobiliaria' : 'Inquilino'}</p>
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
