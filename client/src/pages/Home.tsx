import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663398513099/NsQTkUPS5UugDCK5DHs6bC/eagle-eye-logo_d71264bc.jpg";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #111111 0%, #1A1A1A 50%, #0d0d0d 100%)" }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-[#2A2A2A]">
        <img src={LOGO_URL} alt="Eagle Eye" className="h-10 w-10 rounded-full object-cover border-2 border-[#C9A84C]" />
        <div>
          <div className="text-white font-semibold text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
            Eagle Eye Management Services
          </div>
          <div className="text-[#C9A84C] text-xs tracking-widest uppercase">Pergola Estimating</div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center">
          <div className="inline-block mb-6">
            <img src={LOGO_URL} alt="Eagle Eye" className="h-24 w-24 rounded-full object-cover border-4 border-[#C9A84C] mx-auto shadow-2xl" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Eagle Eye
          </h1>
          <h2 className="text-xl text-[#C9A84C] font-medium tracking-wide mb-6">
            Pergola Estimating Platform
          </h2>
          <p className="text-gray-400 text-base mb-10 leading-relaxed max-w-lg mx-auto">
            Generate professional pre-construction estimating packages for commercial aluminum pergola and patio shading systems — complete with parametric drawings, QTO, and branded PDF export.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href={getLoginUrl()}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded font-semibold text-sm transition-all"
              style={{ backgroundColor: "#C9A84C", color: "#111111" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#E8C96A")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#C9A84C")}
            >
              Sign In to Get Started
            </a>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            {[
              { icon: "📐", label: "Parametric SVG Drawings" },
              { icon: "📊", label: "Auto QTO Calculation" },
              { icon: "📋", label: "Field Verification Checklist" },
              { icon: "📄", label: "Branded PDF Export" },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded p-4 text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-gray-300 text-xs font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-[#2A2A2A] flex items-center justify-between text-xs text-gray-600">
        <span>© 2025 Eagle Eye Management Services</span>
        <span className="text-[#C9A84C]">Prepared by: Ranaldo Daniels</span>
        <span>Concept Only — Not For Construction</span>
      </footer>
    </div>
  );
}
