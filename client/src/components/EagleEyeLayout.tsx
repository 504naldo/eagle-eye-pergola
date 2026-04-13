import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, FolderOpen, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663398513099/NsQTkUPS5UugDCK5DHs6bC/eagle-eye-logo_d71264bc.jpg";

interface EagleEyeLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function EagleEyeLayout({ children, title }: EagleEyeLayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="brand-header h-16 flex items-center px-4 lg:px-6 z-50 sticky top-0">
        <div className="flex items-center gap-3 flex-1">
          <button
            className="lg:hidden text-white mr-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <img src={LOGO_URL} alt="Eagle Eye" className="h-10 w-10 rounded-full object-cover border-2 border-[#C9A84C]" />
          <div>
            <div className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Eagle Eye Management Services
            </div>
            <div className="text-[#C9A84C] text-xs tracking-widest uppercase">Pergola Estimating</div>
          </div>
        </div>
        {isAuthenticated && user && (
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm hidden sm:block">{user.name}</span>
            <button
              onClick={() => logout()}
              className="text-gray-400 hover:text-[#C9A84C] transition-colors"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-56 pt-16 flex flex-col
          bg-[#111111] border-r border-[#2A2A2A]
          transform transition-transform duration-200
          lg:static lg:translate-x-0 lg:pt-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <nav className="flex-1 py-4 px-2 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <a
                  className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all ${
                    isActive(href)
                      ? "bg-[#1A1A1A] border-l-2 border-[#C9A84C] text-[#C9A84C] pl-[10px]"
                      : "text-gray-400 hover:text-white hover:bg-[#1A1A1A]"
                  }`}
                  onClick={() => setMobileOpen(false)}
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
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">
          {title && (
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
              <div className="w-1 h-6 bg-[#C9A84C] rounded-full" />
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            </div>
          )}
          <div className="flex-1 p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="brand-footer py-3 px-6 flex items-center justify-between text-xs">
        <span>© 2025 Eagle Eye Management Services</span>
        <span className="text-[#C9A84C]">Prepared by: Ranaldo Daniels</span>
        <span>Concept Only — Not For Construction</span>
      </footer>
    </div>
  );
}
