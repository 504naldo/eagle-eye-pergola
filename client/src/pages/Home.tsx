import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663398513099/NsQTkUPS5UugDCK5DHs6bC/eagle-eye-logo_d71264bc.jpg";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      navigate("/dashboard");
    },
    onError: (e) => setErrorMsg(e.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      navigate("/dashboard");
    },
    onError: (e) => setErrorMsg(e.message),
  });

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading]);

  const isPending = loginMutation.isPending || registerMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    if (tab === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, name: name || undefined });
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #111111 0%, #1A1A1A 50%, #0d0d0d 100%)" }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-[#2A2A2A]">
        <img
          src={LOGO_URL}
          alt="Eagle Eye"
          className="h-10 w-10 rounded-full object-cover border-2 border-[#C9A84C]"
        />
        <div>
          <div
            className="text-white font-semibold text-sm"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Eagle Eye Management Services
          </div>
          <div className="text-[#C9A84C] text-xs tracking-widest uppercase">
            Pergola Estimating
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-12 items-center">
          {/* Left: hero text */}
          <div className="flex-1 text-center lg:text-left">
            <img
              src={LOGO_URL}
              alt="Eagle Eye"
              className="h-20 w-20 rounded-full object-cover border-4 border-[#C9A84C] mx-auto lg:mx-0 shadow-2xl mb-6"
            />
            <h1
              className="text-4xl lg:text-5xl font-bold text-white mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Eagle Eye
            </h1>
            <h2 className="text-xl text-[#C9A84C] font-medium tracking-wide mb-6">
              Pergola Estimating Platform
            </h2>
            <p className="text-gray-400 text-base mb-8 leading-relaxed max-w-lg">
              Generate professional pre-construction estimating packages for commercial aluminum
              pergola and patio shading systems — complete with parametric drawings, QTO, and
              branded PDF export.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto lg:mx-0">
              {[
                { icon: "📐", label: "Parametric SVG Drawings" },
                { icon: "📊", label: "Auto QTO Calculation" },
                { icon: "📋", label: "Field Verification Checklist" },
                { icon: "📄", label: "Branded PDF Export" },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded p-3 text-center"
                >
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-gray-300 text-xs font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: auth form */}
          <div className="w-full max-w-sm">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 shadow-2xl">
              {/* Tabs */}
              <div className="flex mb-6 border border-[#2A2A2A] rounded-lg overflow-hidden">
                {(["login", "register"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTab(t); setErrorMsg(""); }}
                    className="flex-1 py-2 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: tab === t ? "#C9A84C" : "transparent",
                      color: tab === t ? "#111111" : "#9CA3AF",
                    }}
                  >
                    {t === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === "register" && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Name (optional)</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={tab === "register" ? "At least 8 characters" : "Your password"}
                    required
                    className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>

                {errorMsg && (
                  <p className="text-red-400 text-xs">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2.5 rounded font-semibold text-sm transition-all disabled:opacity-50"
                  style={{ backgroundColor: "#C9A84C", color: "#111111" }}
                >
                  {isPending
                    ? tab === "login"
                      ? "Signing in…"
                      : "Creating account…"
                    : tab === "login"
                    ? "Sign In"
                    : "Create Account"}
                </button>
              </form>
            </div>
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
