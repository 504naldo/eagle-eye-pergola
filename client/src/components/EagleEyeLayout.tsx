import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663398513099/NsQTkUPS5UugDCK5DHs6bC/eagle-eye-logo_d71264bc.jpg";

interface EagleEyeLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function EagleEyeLayout({ children, title }: EagleEyeLayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="brand-header h-14 sm:h-16 flex items-center px-3 sm:px-4 lg:px-6 z-50 sticky top-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            className="lg:hidden text-white p-1.5 -ml-1 rounded hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <img src={LOGO_URL} alt="Eagle Eye" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover border-2 border-[#C9A84C] flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-white font-semibold text-xs sm:text-sm leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="hidden sm:inline">Eagle Eye Management Services</span>
              <span className="sm:hidden">Eagle Eye</span>
            </div>
            <div className="text-[#C9A84C] text-[10px] sm:text-xs tracking-widest uppercase">Pergola Estimating</div>
          </div>
        </div>
        {isAuthenticated && user && (
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className="text-gray-400 text-xs sm:text-sm hidden md:block truncate max-w-[120px]">{user.name}</span>
            <button
              onClick={() => logout()}
              className="text-gray-400 hover:text-[#C9A84C] transition-colors p-1.5 rounded touch-manipulation"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-60 pt-14 sm:pt-16 flex flex-col
          bg-[#111111] border-r border-[#2A2A2A]
          transform transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0 lg:pt-0 lg:w-56
          ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}>
          <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <a
                  className={`flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded text-sm transition-all touch-manipulation ${
                    isActive(href)
                      ? "bg-[#1A1A1A] border-l-2 border-[#C9A84C] text-[#C9A84C] pl-[10px]"
                      : "text-gray-400 hover:text-white hover:bg-[#1A1A1A] active:bg-[#222]"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </a>
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-[#2A2A2A]">
            <div className="text-[#C9A84C] text-xs font-semibold tracking-widest uppercase mb-1">Concept Only</div>
            <div className="text-gray-600 text-xs">Not For Construction</div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {title && (
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
              <div className="w-1 h-5 sm:h-6 bg-[#C9A84C] rounded-full flex-shrink-0" />
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h1>
            </div>
          )}
          <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="brand-footer py-2.5 sm:py-3 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs gap-1 sm:gap-0">
        <span className="hidden sm:block">© 2025 Eagle Eye Management Services</span>
        <span className="text-[#C9A84C]">Prepared by: Ranaldo Daniels</span>
        <span className="text-gray-500 sm:text-inherit">Concept Only — Not For Construction</span>
      </footer>
    </div>
  );
}
