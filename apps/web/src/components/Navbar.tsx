'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  Menu,
  X,
  ChevronDown,
  User,
  LayoutDashboard,
  Calendar,
  LogOut,
  Crown,
} from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // ── Scroll detection ──
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // ── Close mobile menu on Escape ──
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        burgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // ── Focus trap in mobile menu ──
  useEffect(() => {
    if (!isMobileMenuOpen || !mobileMenuRef.current) return;

    const menu = mobileMenuRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = menu.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    // Auto-focus first item
    const firstFocusable = menu.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    return () => document.removeEventListener('keydown', handleTab);
  }, [isMobileMenuOpen]);

  const handleLogout = useCallback(() => {
    logout();
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/');
  }, [logout, router]);

  const closeMobile = useCallback(() => setIsMobileMenuOpen(false), []);

  // "Comment ça marche" : scroll to section on homepage, navigate otherwise
  const handleHowItWorks = useCallback(() => {
    closeMobile();
    if (pathname === '/') {
      const section = document.getElementById('comment-ca-marche');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    router.push('/#comment-ca-marche');
  }, [pathname, router, closeMobile]);

  return (
    <nav
      role="navigation"
      aria-label="Navigation principale"
      className={`sticky top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-surface/95 backdrop-blur-md shadow-soft border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* ── Logo ── */}
          <Link
            href="/"
            className="flex items-center gap-2 group focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded-lg"
            aria-label="Khadamat — Accueil"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-orange group-hover:shadow-orange-lg transition-all duration-300 group-hover:scale-105">
              <span className="text-white font-bold text-xl" aria-hidden="true">K</span>
            </div>
            <span className="text-2xl font-bold text-text-primary">
              Khadamat
            </span>
          </Link>

          {/* ── Desktop Navigation ── */}
          <div className="hidden md:flex items-center gap-2">
            {/* Nav Links (toujours visibles) */}
            <div className="flex items-center gap-6 mr-6">
              {(!isAuthenticated || user?.role === 'PRO') && (
                <Link
                  href="/plans"
                  className="px-5 py-2.5 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 font-medium focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                >
                  Abonnement
                </Link>
              )}
              <Link
                href="/blog"
                className="px-5 py-2.5 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 font-medium focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
              >
                Blog
              </Link>
              <button
                type="button"
                onClick={handleHowItWorks}
                className="px-5 py-2.5 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 font-medium focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
              >
                Comment ça marche
              </button>
            </div>

            {/* Auth area */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-text-secondary hover:text-primary-600 font-semibold transition-colors rounded-xl focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/register"
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold shadow-orange hover:shadow-orange-lg transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  Inscription
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Premium for PRO */}
                {user?.role === 'PRO' && (
                  <Link
                    href="/plans"
                    className="flex items-center gap-2 px-4 py-2 border-2 border-primary-500 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                  >
                    <Crown className="w-4 h-4" aria-hidden="true" />
                    Premium
                  </Link>
                )}

                {/* User dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    aria-expanded={isDropdownOpen}
                    aria-controls="user-dropdown"
                    aria-label={`Menu utilisateur — ${user?.firstName || 'Mon compte'}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-muted transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-white" aria-hidden="true">
                        {user?.firstName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-text-primary hidden lg:block">
                      {user?.firstName}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown */}
                  {isDropdownOpen && (
                    <div
                      id="user-dropdown"
                      role="menu"
                      className="absolute right-0 mt-2 w-56 bg-surface rounded-2xl shadow-xl border border-border py-2 animate-fade-in"
                    >
                      {user?.role === 'PRO' && (
                        <Link
                          href="/dashboard"
                          role="menuitem"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
                          <span>Tableau de bord</span>
                        </Link>
                      )}

                      {user?.role === 'CLIENT' && (
                        <Link
                          href="/client/bookings"
                          role="menuitem"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <Calendar className="w-5 h-5" aria-hidden="true" />
                          <span>Mes Réservations</span>
                        </Link>
                      )}

                      <Link
                        href="/profile"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <User className="w-5 h-5" aria-hidden="true" />
                        <span>Mon Compte</span>
                      </Link>

                      <div className="my-2 border-t border-border-muted mx-2" role="separator" />

                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-error-600 hover:bg-error-50 transition-colors"
                      >
                        <LogOut className="w-5 h-5" aria-hidden="true" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Mobile Burger ── */}
          <button
            ref={burgerRef}
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="md:hidden p-2 rounded-xl hover:bg-surface-muted transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-text-primary" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6 text-text-primary" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          ref={mobileMenuRef}
          role="menu"
          className="md:hidden bg-surface border-t border-border-muted animate-fade-in"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-2">
            {/* Nav links (toujours visibles) */}
            {(!isAuthenticated || user?.role === 'PRO') && (
              <Link
                href="/plans"
                role="menuitem"
                onClick={closeMobile}
                className="block px-4 py-3 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors font-medium focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
              >
                Abonnement
              </Link>
            )}
            <Link
              href="/blog"
              role="menuitem"
              onClick={closeMobile}
              className="block px-4 py-3 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors font-medium focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
            >
              Blog
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleHowItWorks}
              className="w-full text-left px-4 py-3 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors font-medium focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
            >
              Comment ça marche
            </button>

            {/* Séparateur + Auth / User menu */}
            <div className="pt-2 border-t border-border-muted mt-2 space-y-2">
              {!isAuthenticated ? (
                <>
                  <Link
                    href="/auth/login"
                    role="menuitem"
                    onClick={closeMobile}
                    className="block px-4 py-3 text-text-secondary hover:text-primary-600 font-semibold rounded-xl transition-colors text-center focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/auth/register"
                    role="menuitem"
                    onClick={closeMobile}
                    className="block px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-center transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                  >
                    Inscription
                  </Link>
                </>
              ) : (
                <>
                  {user?.role === 'PRO' && (
                    <Link
                      href="/dashboard"
                      role="menuitem"
                      onClick={closeMobile}
                      className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:bg-primary-50 rounded-xl focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                    >
                      <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
                      Tableau de bord
                    </Link>
                  )}
                  {user?.role === 'CLIENT' && (
                    <Link
                      href="/client/bookings"
                      role="menuitem"
                      onClick={closeMobile}
                      className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:bg-primary-50 rounded-xl focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                    >
                      <Calendar className="w-5 h-5" aria-hidden="true" />
                      Mes Réservations
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={closeMobile}
                    className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:bg-primary-50 rounded-xl focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                  >
                    <User className="w-5 h-5" aria-hidden="true" />
                    Mon Compte
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-error-600 hover:bg-error-50 rounded-xl mt-2 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                  >
                    <LogOut className="w-5 h-5" aria-hidden="true" />
                    Déconnexion
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
