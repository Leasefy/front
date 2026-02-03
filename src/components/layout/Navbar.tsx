"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut, LayoutDashboard, FileText, ChevronDown, Home, Building2, Users, Briefcase, Building, Shield, CreditCard, BarChart3, Code, ClipboardList, Umbrella } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Navbar - SpaceO clean style
 * Full-width white header with simple navigation
 */
const audienceLinks = [
  { href: '/para/propietarios', label: 'Propietarios', icon: Building2, description: 'Arrienda sin comisiones' },
  { href: '/para/inquilinos', label: 'Inquilinos', icon: Users, description: 'Encuentra tu próximo hogar' },
  { href: '/para/inmobiliarias', label: 'Inmobiliarias', icon: Building, description: 'Escala con tecnología' },
  { href: '/para/agentes', label: 'Agentes', icon: Briefcase, description: 'Cierra más arriendos' },
];

const productLinks = [
  { href: '/productos/evaluacion', label: 'Evaluación de inquilinos', icon: BarChart3, description: 'Scoring crediticio y verificación' },
  { href: '/productos/pagos', label: 'Pagos', icon: CreditCard, description: 'Recauda arriendo automáticamente' },
  { href: '/productos/contratos', label: 'Contratos digitales', icon: FileText, description: 'Firma electrónica certificada' },
  { href: '/productos/aplicaciones', label: 'Aplicaciones', icon: ClipboardList, description: 'Recibe aplicaciones online' },
  { href: '/productos/seguro', label: 'Seguro de arrendamiento', icon: Umbrella, description: 'Protección ante impagos' },
  { href: '/productos/api', label: 'API para desarrolladores', icon: Code, description: 'Integra en tu plataforma' },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isParaQuienOpen, setIsParaQuienOpen] = useState(false);
  const [isProductosOpen, setIsProductosOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();

  // Check if a path is active
  const isActive = (path: string) => {
    if (path === '/propiedades') {
      return pathname === '/propiedades' || pathname.startsWith('/propiedades/');
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Get dashboard link based on user role
  const getDashboardLink = () => {
    if (!user) return '/';
    return user.role === 'landlord' ? '/panel' : '/inquilino';
  };

  const getDashboardLabel = () => {
    if (!user) return 'Mi panel';
    return user.role === 'landlord' ? 'Panel de propietario' : 'Mi panel';
  };

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
      "z-50 bg-white dark:bg-card border border-border dark:border-border rounded-[1px] shadow-sm",
      pathname === '/propiedades' || pathname.startsWith('/propiedades?')
        ? "relative"
        : "fixed top-4 left-4 right-4"
    )}>
      <div className="px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left side - Logo + Nav Link */}
          <div className="flex items-center gap-10">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              {/* Simple infinity-like logo icon */}
              <svg
                viewBox="0 0 40 24"
                className="w-8 h-5 text-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 12c0-3 2-6 6-6s6 3 6 6-2 6-6 6-6-3-6-6" />
                <path d="M20 12c0-3 2-6 6-6s6 3 6 6-2 6-6 6-6-3-6-6" />
              </svg>
              <span className="text-base font-medium text-foreground tracking-tight">
                Arriendo Facil
              </span>
            </Link>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <Button
                variant={isActive('/publicar') ? "default" : "secondary"}
                hideArrow
                asChild
              >
                <Link href="/publicar">Publicar Inmueble</Link>
              </Button>
              <Link
                href="/propiedades"
                className={cn(
                  "text-sm transition-colors",
                  isActive('/propiedades')
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Buscar Inmueble
              </Link>
              <Link
                href="/pricing"
                className={cn(
                  "text-sm transition-colors",
                  isActive('/pricing')
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Precios
              </Link>

              {/* Para quién dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsParaQuienOpen(!isParaQuienOpen)}
                  className={cn(
                    "flex items-center gap-1 text-sm transition-colors",
                    isActive('/para')
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-expanded={isParaQuienOpen}
                  aria-haspopup="true"
                >
                  Para quién
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isParaQuienOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isParaQuienOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setIsParaQuienOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute left-0 top-full mt-3 w-64 bg-white dark:bg-card border border-border dark:border-border rounded-sm shadow-lg z-50 origin-top-left"
                      >
                        <div className="py-2">
                          {audienceLinks.map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsParaQuienOpen(false)}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Icon className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                                  <p className="text-xs text-muted-foreground">{item.description}</p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Productos dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProductosOpen(!isProductosOpen)}
                  className={cn(
                    "flex items-center gap-1 text-sm transition-colors",
                    isActive('/productos')
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-expanded={isProductosOpen}
                  aria-haspopup="true"
                >
                  Productos
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isProductosOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isProductosOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProductosOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute left-0 top-full mt-3 w-72 bg-white dark:bg-card border border-border dark:border-border rounded-sm shadow-lg z-50 origin-top-left"
                      >
                        <div className="py-2">
                          {productLinks.map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsProductosOpen(false)}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Icon className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                                  <p className="text-xs text-muted-foreground">{item.description}</p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right side - Auth Links or User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-black/10 animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <>
                      {/* Backdrop to close menu */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-card border border-border dark:border-border rounded-sm shadow-lg z-50 origin-top-right"
                      >
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-black/5 rounded-full text-muted-foreground">
                            {user.role === 'landlord' ? 'Propietario' : 'Inquilino'}
                          </span>
                        </div>

                        {/* Menu items */}
                        <div className="py-1">
                          <Link
                            href={getDashboardLink()}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-black/5 transition-colors"
                          >
                            {user.role === 'landlord' ? (
                              <LayoutDashboard className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                            {getDashboardLabel()}
                          </Link>
                          <Link
                            href={getLeasesLink()}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-black/5 transition-colors"
                          >
                            <Home className="w-4 h-4" />
                            {getLeasesLabel()}
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-black/5 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
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
                <Button variant="secondary" hideArrow asChild>
                  <Link href="/auth">Iniciar sesion</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth?mode=register">Registrarme</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-foreground"
            aria-label={isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
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
              <Link
                href="/publicar"
                className={cn(
                  "block min-h-[44px] py-3 text-sm font-medium transition-colors flex items-center",
                  isActive('/publicar') ? "text-foreground" : "text-foreground/70 hover:text-foreground"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Publicar Inmueble
                {isActive('/publicar') && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-black" />}
              </Link>
              <Link
                href="/propiedades"
                className={cn(
                  "block min-h-[44px] py-3 text-sm transition-colors flex items-center",
                  isActive('/propiedades') ? "text-foreground font-medium" : "text-foreground/70 hover:text-foreground"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
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
                onClick={() => setIsMobileMenuOpen(false)}
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
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
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
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 min-h-[44px] py-3 text-sm transition-colors",
                        isActive(item.href) ? "text-foreground font-medium" : "text-foreground/70 hover:text-foreground"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
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
                        <p className="text-xs text-muted-foreground">{user.role === 'landlord' ? 'Propietario' : 'Inquilino'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard link */}
                  <Link
                    href={getDashboardLink()}
                    className="flex items-center gap-3 min-h-[44px] py-3 text-sm text-foreground/70 hover:text-foreground transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {user.role === 'landlord' ? (
                      <LayoutDashboard className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {getDashboardLabel()}
                  </Link>

                  {/* Leases link */}
                  <Link
                    href={getLeasesLink()}
                    className="flex items-center gap-3 min-h-[44px] py-3 text-sm text-foreground/70 hover:text-foreground transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Home className="w-4 h-4" />
                    {getLeasesLabel()}
                  </Link>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full min-h-[44px] py-3 text-sm text-foreground/70 hover:text-foreground transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesion
                  </button>
                </>
              ) : (
                <div className="pt-3 mt-3 border-t border-border space-y-1">
                  <Link
                    href="/auth"
                    className="block min-h-[44px] py-3 text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Iniciar sesion
                  </Link>
                  <Link
                    href="/auth?mode=register"
                    className="block min-h-[44px] py-3 text-sm font-medium text-foreground hover:text-foreground/70 transition-colors flex items-center"
                    onClick={() => setIsMobileMenuOpen(false)}
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
