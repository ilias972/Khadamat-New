'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Menu, X, ChevronDown, User, LayoutDashboard, Calendar, LogOut, Crown } from 'lucide-react';

/**
 * Navbar
 *
 * Floating navigation bar with blur effect
 * - Transparent initially, solid on scroll
 * - Mobile responsive with hamburger menu
 * - User dropdown for authenticated users
 */
export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/');
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-soft'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-orange group-hover:shadow-orange-lg transition-all duration-300 group-hover:scale-105">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <span className={`text-2xl font-bold transition-colors ${
              isScrolled ? 'text-text-primary' : 'text-text-primary'
            }`}>
              Khadamat
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {/* Nav Links */}
            <div className="flex items-center gap-1 mr-4">
              {pathname !== '/' && (
                <Link
                  href="/"
                  className="px-4 py-2 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 font-medium"
                >
                  Accueil
                </Link>
              )}
              <Link
                href="/pros"
                className="px-4 py-2 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 font-medium"
              >
                Trouver un Pro
              </Link>
            </div>

            {/* Auth Buttons */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/register"
                  className="px-4 py-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                >
                  Devenir Pro
                </Link>
                <Link
                  href="/auth/login"
                  className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 shadow-orange hover:shadow-orange-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  Connexion
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Premium Button for PRO */}
                {user?.role === 'PRO' && (
                  <Link
                    href="/plans"
                    className="flex items-center gap-2 px-4 py-2 border-2 border-primary-500 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition-all duration-200"
                  >
                    <Crown className="w-4 h-4" />
                    Premium
                  </Link>
                )}

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-muted transition-all duration-200"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-white">
                        {user?.firstName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-text-primary hidden lg:block">
                      {user?.firstName}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-border py-2 animate-fade-in">
                      {user?.role === 'PRO' && (
                        <Link
                          href="/dashboard"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <LayoutDashboard className="w-5 h-5" />
                          <span>Tableau de bord</span>
                        </Link>
                      )}

                      {user?.role === 'CLIENT' && (
                        <Link
                          href="/client/bookings"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <Calendar className="w-5 h-5" />
                          <span>Mes Réservations</span>
                        </Link>
                      )}

                      <Link
                        href="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <User className="w-5 h-5" />
                        <span>Mon Compte</span>
                      </Link>

                      <div className="my-2 border-t border-border-muted mx-2"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-error-600 hover:bg-error-50 transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-surface-muted transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-text-primary" />
            ) : (
              <Menu className="w-6 h-6 text-text-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-border-muted animate-fade-in">
          <div className="container mx-auto px-6 py-4 space-y-2">
            {pathname !== '/' && (
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors font-medium"
              >
                Accueil
              </Link>
            )}
            <Link
              href="/pros"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-3 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors font-medium"
            >
              Trouver un Pro
            </Link>

            {!isAuthenticated ? (
              <>
                <div className="pt-2 border-t border-border-muted mt-2">
                  <Link
                    href="/auth/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 text-primary-600 font-semibold"
                  >
                    Devenir Pro
                  </Link>
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block mt-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold text-center"
                  >
                    Connexion
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="pt-2 border-t border-border-muted mt-2">
                  {user?.role === 'PRO' && (
                    <>
                      <Link
                        href="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:bg-primary-50 rounded-xl"
                      >
                        <LayoutDashboard className="w-5 h-5" />
                        Tableau de bord
                      </Link>
                      <Link
                        href="/plans"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-primary-50 rounded-xl font-semibold"
                      >
                        <Crown className="w-5 h-5" />
                        Devenir Premium
                      </Link>
                    </>
                  )}
                  {user?.role === 'CLIENT' && (
                    <Link
                      href="/client/bookings"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:bg-primary-50 rounded-xl"
                    >
                      <Calendar className="w-5 h-5" />
                      Mes Réservations
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:bg-primary-50 rounded-xl"
                  >
                    <User className="w-5 h-5" />
                    Mon Compte
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-error-600 hover:bg-error-50 rounded-xl mt-2"
                  >
                    <LogOut className="w-5 h-5" />
                    Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
