import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { Logo } from '@/components/common';
import { Footer } from '@/components/layout/Footer';
import { cn } from '@/utils/cn';

const navLinks = [
  { to: PUBLIC_ROUTES.home, label: 'Home', end: true },
  { to: PUBLIC_ROUTES.features, label: 'How it works?', end: false },
  { to: PUBLIC_ROUTES.about, label: "What it's about", end: false },
  { to: PUBLIC_ROUTES.contact, label: 'Contact', end: false },
];

export function PublicLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // The header pill fades in from transparent to a frosted-glass card once
  // the page scrolls under it, and settles back at the top of the page.
  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 20);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#dfeee3]">
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="sticky top-0 z-40 px-3 pt-4 sm:px-4"
      >
        <div className="mx-auto max-w-[1400px]">
          <div
            className={cn(
              'flex items-center justify-between gap-4 rounded-full border transition-all duration-500 ease-out',
              isScrolled
                ? 'border-black/[0.06] bg-white/75 px-4 py-1.5 shadow-lg shadow-black/5 backdrop-blur-xl sm:px-6'
                : 'border-transparent bg-transparent px-2 py-3 sm:px-3',
            )}
          >
            <Link to={PUBLIC_ROUTES.home} className="group relative shrink-0 text-brand-900">
              <motion.div whileHover={{ scale: 1.05, rotate: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Logo showTagline wordmarkClassName="text-lg font-extrabold tracking-tight text-brand-700 sm:text-xl" />
              </motion.div>
            </Link>

            <nav className="hidden items-center gap-1 rounded-full border border-black/5 bg-white/70 p-1.5 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm lg:flex">
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className="relative">
                  {({ isActive }) => (
                    <span
                      className={cn(
                        'relative z-10 flex items-center rounded-full px-4 py-2 transition-colors duration-300',
                        isActive ? 'text-white' : 'hover:text-[#1c8f53]',
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="public-nav-pill"
                          className="absolute inset-0 -z-10 rounded-full bg-[#1c8f53]"
                          transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                        />
                      )}
                      {link.label}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="hidden shrink-0 items-center gap-4 lg:flex">
              <Link
                to={PUBLIC_ROUTES.login}
                className="text-sm font-semibold text-gray-700 transition-colors duration-200 hover:text-gray-900"
              >
                Login
              </Link>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to={PUBLIC_ROUTES.register}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-[#1c8f53] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-[#177e48]"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 transition-colors duration-200 hover:bg-black/5 lg:hidden',
                !isScrolled && 'bg-white/70 shadow-sm backdrop-blur-sm',
              )}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </motion.button>
          </div>

          <div
            className={cn(
              'grid overflow-hidden transition-all duration-300 ease-out lg:hidden',
              isMenuOpen ? 'mt-2 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <nav className="flex flex-col divide-y divide-gray-100 px-2 py-2">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      cn(
                        'rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50',
                        isActive && 'font-semibold text-[#1c8f53]',
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
              <div className="flex flex-col gap-2 border-t border-gray-100 p-3">
                <Link
                  to={PUBLIC_ROUTES.login}
                  className="rounded-full px-4 py-2.5 text-center text-sm font-semibold text-gray-700 transition-colors duration-200 hover:bg-gray-50"
                >
                  Login
                </Link>
                <Link
                  to={PUBLIC_ROUTES.register}
                  className="rounded-full bg-[#1c8f53] px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#177e48]"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
