import { Outlet, Link } from "react-router-dom";
import { Menu, X, Car } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/constants";
import { useAuth } from "@/providers";
import { getDashboardPath } from "@/utils/auth";
import Logo from "@/assets/Logo.svg";

export function PublicLayout() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      <header className="sticky top-0 z-40 bg-white/10 backdrop-blur-2xl border-b border-white/20 shadow-[0_30px_120px_rgba(15,23,42,0.45)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl text-white"
          >
            <img src={Logo} alt="Taxi Meik logo" className="h-9 w-auto object-contain" />
            {APP_NAME}
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              to="/about"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Contact
            </Link>
            <Link
              to="/faq"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              FAQ
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <Link to={getDashboardPath(user.role)}>
                <Button className="bg-amber-500 text-white hover:bg-amber-500/90">
                  Return To Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-white/70 hover:bg-white/[0.18] hover:text-white/90 "
                  >
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-amber-500 text-white hover:bg-amber-500/90">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden border-t border-white/10 p-4 bg-slate-950 space-y-3">
            <Link
              to="/cars"
              className="block text-sm text-white/60"
              onClick={() => setMobileMenu(false)}
            >
              Browse Cars
            </Link>
            <Link
              to="/"
              className="block text-sm text-white/60"
              onClick={() => setMobileMenu(false)}
            >
              Home
            </Link>
            <Link
              to="/about"
              className="block text-sm text-white/60"
              onClick={() => setMobileMenu(false)}
            >
              About
            </Link>
            <Link
              to="/contact"
              className="block text-sm text-white/60"
              onClick={() => setMobileMenu(false)}
            >
              Contact
            </Link>
            <Link
              to="/faq"
              className="block text-sm text-white/60"
              onClick={() => setMobileMenu(false)}
            >
              FAQ
            </Link>
            <div className="flex gap-3 pt-2 border-t border-white/10">
              {isAuthenticated && user ? (
                <Link to={getDashboardPath(user.role)} className="flex-1">
                  <Button className="w-full bg-amber-500 text-white hover:bg-amber-500/90">
                    Return To Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full   border-white/20 text-white"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link to="/register" className="flex-1">
                    <Button className="w-full bg-amber-500 text-white hover:bg-amber-500/90">
                      Register
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-white/20 bg-white/10 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-lg mb-4 text-white">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white">
                  <Car className="w-4 h-4" />
                </div>
                {APP_NAME}
              </div>
              <p className="text-sm text-white/65">
                Myanmar's trusted platform for taxi car rentals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-white">Quick Links</h4>
              <div className="space-y-2 text-sm text-white/65">
                <Link to="/about" className="block hover:text-white">
                  About Us
                </Link>
                <Link to="/contact" className="block hover:text-white">
                  Contact
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-white">Support</h4>
              <div className="space-y-2 text-sm text-white/65">
                <Link to="/faq" className="block hover:text-white">
                  FAQ
                </Link>
                <Link to="/terms" className="block hover:text-white">
                  Terms & Conditions
                </Link>
                <Link to="/privacy" className="block hover:text-white">
                  Privacy Policy
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-white">Contact</h4>
              <div className="space-y-2 text-sm text-white/65">
                <p>info@taxirental.mm</p>
                <p>+95 1 234 5678</p>
                <p>Yangon, Myanmar</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-white/50">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
