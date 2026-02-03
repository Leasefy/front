"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut, LayoutDashboard, FileText, ChevronDown, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Navbar - SpaceO clean style
 * Full-width white header with simple navigation
 */
export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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
