import type { AppProps } from "next/app"
import { Toaster } from "react-hot-toast"
import { useEffect, useState } from "react"
import "../styles/globals.css"

export default function App({ Component, pageProps }: AppProps) {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("dsm-theme")
    const dark = stored !== "light"
    setIsDark(dark)
    document.documentElement.classList.toggle("dark", dark)
  }, [])

  // Listen for theme changes dispatched by Layout
  useEffect(() => {
    const handler = (e: Event) => {
      const dark = (e as CustomEvent).detail === "dark"
      setIsDark(dark)
    }
    window.addEventListener("dsm-theme-change", handler)
    return () => window.removeEventListener("dsm-theme-change", handler)
  }, [])

  const toastStyle = isDark
    ? { background: "#161616", color: "#f0f0f0", border: "1px solid #333", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }
    : { background: "#ffffff", color: "#111827", border: "1px solid #e5e7eb", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }

  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: toastStyle,
          success: { iconTheme: { primary: "#f59e0b", secondary: isDark ? "#0a0a0a" : "#ffffff" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: isDark ? "#0a0a0a" : "#ffffff" } },
        }}
      />
    </>
  )
}
