import Link from "next/link"
import { useRouter } from "next/router"
import { useAuth } from "@/lib/api"
import { ShoppingBag, LayoutDashboard, Users, LogOut, Wallet, Shield, Sun, Moon, Menu, X } from "lucide-react"
import { useEffect, useState } from "react"

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isDark, setIsDark] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("dsm-theme")
    setIsDark(stored !== "light")
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [router.pathname])

  function toggleTheme() {
    const next = isDark ? "light" : "dark"
    setIsDark(!isDark)
    localStorage.setItem("dsm-theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
    window.dispatchEvent(new CustomEvent("dsm-theme-change", { detail: next }))
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const navLinks = user?.is_admin ? [
    { href: "/",          label: "Store",  icon: ShoppingBag },
    { href: "/dashboard", label: "Orders", icon: LayoutDashboard },
    { href: "/admin",     label: "Admin",  icon: Shield },
    { href: "/admin/users", label: "Users", icon: Users },
  ] : [
    { href: "/",          label: "Store",  icon: ShoppingBag },
    { href: "/dashboard", label: "Orders", icon: LayoutDashboard },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-onyx-950/90 backdrop-blur border-b border-onyx-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gold-500 flex items-center justify-center">
              <ShoppingBag size={14} className="text-onyx-950" />
            </div>
            <span className="font-display text-base sm:text-lg font-semibold text-white">
              DSM <span className="text-gold-500">Mall</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${router.pathname === href
                      ? "bg-gold-500/10 text-gold-400"
                      : "text-onyx-400 hover:text-onyx-100 hover:bg-onyx-800"}`}>
                  <Icon size={14} />
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button onClick={toggleTheme}
              className="p-1.5 rounded-lg text-onyx-400 hover:text-gold-400 hover:bg-onyx-800 transition-all"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {user ? (
              <>
                {/* DSP balance — hidden on very small screens */}
                <div className="hidden sm:flex items-center gap-2 bg-onyx-900 border border-onyx-800 rounded-lg px-2.5 py-1.5">
                  <Wallet size={13} className="text-gold-500" />
                  <span className="text-xs font-mono text-onyx-300">
                    {parseFloat(user.dsp_balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} DSP
                  </span>
                </div>
                {/* User name — hidden on mobile */}
                <div className="hidden lg:block text-xs text-onyx-400">{user.full_name}</div>
                {user.is_admin && (
                  <span className="hidden sm:inline-flex badge bg-gold-500/10 text-gold-400 border border-gold-500/20">Admin</span>
                )}
                <button onClick={handleLogout}
                  className="p-1.5 rounded-lg text-onyx-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <LogOut size={15} />
                </button>
                {/* Hamburger menu — mobile only */}
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden p-1.5 rounded-lg text-onyx-400 hover:text-gold-400 hover:bg-onyx-800 transition-all">
                  {menuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </>
            ) : (
              <>
                <Link href="/login"    className="btn-outline text-xs py-1.5 sm:py-2 px-3 sm:px-4">Sign In</Link>
                <Link href="/register" className="btn-gold   text-xs py-1.5 sm:py-2 px-3 sm:px-4">Sign Up</Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && user && (
          <div className="md:hidden border-t border-onyx-800 bg-onyx-950/95 backdrop-blur px-4 py-3 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${router.pathname === href
                    ? "bg-gold-500/10 text-gold-400"
                    : "text-onyx-400 hover:text-onyx-100 hover:bg-onyx-800"}`}>
                <Icon size={16} />
                {label}
              </Link>
            ))}
            {/* Show balance in mobile menu */}
            <div className="sm:hidden flex items-center gap-2 px-3 py-2.5 text-xs font-mono text-onyx-400">
              <Wallet size={14} className="text-gold-500" />
              {parseFloat(user.dsp_balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} DSP
              {user.is_admin && (
                <span className="badge bg-gold-500/10 text-gold-400 border border-gold-500/20 ml-auto">Admin</span>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-onyx-900 py-4 sm:py-6 text-center text-xs text-onyx-600 font-mono px-4">
        DSM Digital Shopping Mall — Pre-order model prototype v1.0
      </footer>
    </div>
  )
}
