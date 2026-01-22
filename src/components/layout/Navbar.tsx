"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, User, LogOut, LayoutDashboard, FileText, ChevronDown, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/use-auth";

/**
 * Navbar - SpaceO clean style
 * Full-width white header with simple navigation
 */
export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Get dashboard link based on user role
  const getDashboardLink = () => {
    if (!user) return '/';
    return user.role === 'landlord' ? '/panel' : '/mis-aplicaciones';
  };

  const getDashboardLabel = () => {
    if (!user) return 'Dashboard';
    return user.role === 'landlord' ? 'Panel de propietario' : 'Mis aplicaciones';
  };

  // Get leases link based on user role
  const getLeasesLink = () => {
    if (!user) return '/';
    return user.role === 'landlord' ? '/panel/leases' : '/mi-arriendo';
  };

  const getLeasesLabel = () => {
    if (!user) return 'Mis arriendos';
    return user.role === 'landlord' ? 'Mis arriendos' : 'Mi arriendo';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Left side - Logo + Nav Link */}
          <div className="flex items-center gap-10">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              {/* Simple infinity-like logo icon */}
              <svg
                viewBox="0 0 40 24"
                className="w-8 h-5 text-black"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 12c0-3 2-6 6-6s6 3 6 6-2 6-6 6-6-3-6-6" />
                <path d="M20 12c0-3 2-6 6-6s6 3 6 6-2 6-6 6-6-3-6-6" />
              </svg>
              <span className="text-base font-medium text-black tracking-tight">
                Arriendo Facil
              </span>
            </Link>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/propiedades"
                className="text-sm text-black/60 hover:text-black transition-colors"
              >
                Propiedades
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-black/60 hover:text-black transition-colors"
              >
                Precios
              </Link>
            </div>
          </div>

          {/* Right side - Auth Links or User Menu */}
          <div className="hidden md:flex items-center gap-6">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-black/10 animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 text-sm text-black/70 hover:text-black transition-colors"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-black/60" />
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
                        className="absolute right-0 top-full mt-2 w-56 bg-white border border-black/5 rounded-[2px] shadow-lg z-50 origin-top-right"
                      >
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-black/5">
                          <p className="text-sm font-medium text-black">{user.name}</p>
                          <p className="text-xs text-black/50 truncate">{user.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-black/5 rounded-[2px] text-black/60">
                            {user.role === 'landlord' ? 'Propietario' : 'Inquilino'}
                          </span>
                        </div>

                        {/* Menu items */}
                        <div className="py-1">
                          <Link
                            href={getDashboardLink()}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-black/70 hover:text-black hover:bg-black/5 transition-colors"
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
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-black/70 hover:text-black hover:bg-black/5 transition-colors"
                          >
                            <Home className="w-4 h-4" />
                            {getLeasesLabel()}
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-black/70 hover:text-black hover:bg-black/5 transition-colors"
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
                <Link
                  href="/auth"
                  className="text-sm text-black/60 hover:text-black transition-colors"
                >
                  Iniciar sesion
                </Link>
                <Link
                  href="/auth"
                  className="px-5 py-2.5 bg-black text-white text-sm font-medium tracking-tight hover:bg-black/90 transition-colors rounded-[2px]"
                >
                  Registrarme
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-black"
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
            className="md:hidden bg-white border-t border-black/5 overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="px-6 py-4 space-y-1"
            >
              <Link
                href="/propiedades"
                className="block min-h-[44px] py-3 text-sm text-black/70 hover:text-black transition-colors flex items-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Propiedades
              </Link>
              <Link
                href="/pricing"
                className="block min-h-[44px] py-3 text-sm text-black/70 hover:text-black transition-colors flex items-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Precios
              </Link>

              {isAuthenticated && user ? (
                <>
                  {/* User info */}
                  <div className="pt-3 mt-3 border-t border-black/5">
                    <div className="flex items-center gap-3 py-3">
                      <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-black/60" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">{user.name}</p>
                        <p className="text-xs text-black/50">{user.role === 'landlord' ? 'Propietario' : 'Inquilino'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard link */}
                  <Link
                    href={getDashboardLink()}
                    className="flex items-center gap-3 min-h-[44px] py-3 text-sm text-black/70 hover:text-black transition-colors"
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
                    className="flex items-center gap-3 min-h-[44px] py-3 text-sm text-black/70 hover:text-black transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Home className="w-4 h-4" />
                    {getLeasesLabel()}
                  </Link>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full min-h-[44px] py-3 text-sm text-black/70 hover:text-black transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesion
                  </button>
                </>
              ) : (
                <div className="pt-3 mt-3 border-t border-black/5 space-y-1">
                  <Link
                    href="/auth"
                    className="block min-h-[44px] py-3 text-sm text-black/70 hover:text-black transition-colors flex items-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Iniciar sesion
                  </Link>
                  <Link
                    href="/auth"
                    className="block min-h-[44px] py-3 text-sm font-medium text-black hover:text-black/70 transition-colors flex items-center"
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
