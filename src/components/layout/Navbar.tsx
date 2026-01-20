"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

/**
 * Navbar - SpaceO clean style
 * Full-width white header with simple navigation
 */
export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

            {/* Nav Link - Desktop */}
            <Link
              href="/propiedades"
              className="hidden md:block text-sm text-black/60 hover:text-black transition-colors"
            >
              Explorar propiedades
            </Link>
          </div>

          {/* Right side - Auth Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/iniciar-sesion"
              className="text-sm text-black/60 hover:text-black transition-colors"
            >
              Iniciar sesion
            </Link>
            <Link
              href="/registrarme"
              className="px-5 py-2.5 bg-black text-white text-sm font-medium tracking-tight hover:bg-black/90 transition-colors rounded-sm"
            >
              Registrarme
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center text-black"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-black/5">
          <div className="px-6 py-4 space-y-1">
            <Link
              href="/propiedades"
              className="block py-3 text-sm text-black/70 hover:text-black transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Explorar propiedades
            </Link>
            <div className="pt-3 mt-3 border-t border-black/5 space-y-1">
              <Link
                href="/iniciar-sesion"
                className="block py-3 text-sm text-black/70 hover:text-black transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Iniciar sesion
              </Link>
              <Link
                href="/registrarme"
                className="block py-3 text-sm font-medium text-black hover:text-black/70 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Registrarme
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
