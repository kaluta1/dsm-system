import { useState } from "react"
import { useRouter } from "next/router"
import { useAuth, apiError } from "@/lib/api"
import toast from "react-hot-toast"
import { ShoppingBag } from "lucide-react"
import Link from "next/link"

export default function Login() {
  const { login } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ email: "", password: "" })
  const [loading, setLoading] = useState(false)

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success("Signed in successfully!")
      router.push("/")
    } catch (e: any) {
      toast.error(apiError(e) || "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gold-500 flex items-center justify-center">
            <ShoppingBag size={22} className="text-onyx-950" />
          </div>
        </div>
        <h1 className="font-display text-2xl text-white text-center mb-1">Sign In</h1>
        <p className="text-onyx-500 text-sm text-center mb-8">Access your DSM account</p>

        <form onSubmit={handle} className="card space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="you@email.com" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} className="btn-gold w-full">
            {loading ? "Signing in…" : "Sign In"}
          </button>
          <p className="text-xs text-center text-onyx-500">
            No account?{" "}
            <Link href="/register" className="text-gold-500 hover:underline">Sign Up</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
