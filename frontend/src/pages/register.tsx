import { useState } from "react"
import { useRouter } from "next/router"
import { useAuth, apiError } from "@/lib/api"
import toast from "react-hot-toast"
import { ShoppingBag } from "lucide-react"
import Link from "next/link"

export default function Register() {
  const { register } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ email: "", full_name: "", password: "", is_admin: false })
  const [loading, setLoading] = useState(false)

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form.email, form.full_name, form.password, form.is_admin)
      toast.success("Account created! Please sign in.")
      router.push("/login")
    } catch (e: any) {
      toast.error(apiError(e) || "Registration failed")
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
        <h1 className="font-display text-2xl text-white text-center mb-1">Create Account</h1>
        <p className="text-onyx-500 text-sm text-center mb-8">Join the Digital Shopping Mall</p>

        <form onSubmit={handle} className="card space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input type="text" className="input" value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              placeholder="John Doe" required />
          </div>
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
              placeholder="Minimum 6 characters" required minLength={6} />
          </div>
          <div className="flex items-center gap-3 bg-onyx-800 rounded-lg px-3 py-2.5">
            <input type="checkbox" id="is_admin" checked={form.is_admin}
              onChange={e => setForm({ ...form, is_admin: e.target.checked })}
              className="accent-gold-500" />
            <label htmlFor="is_admin" className="text-xs font-mono text-onyx-400 cursor-pointer">
              Administrator account (test only)
            </label>
          </div>
          <button type="submit" disabled={loading} className="btn-gold w-full">
            {loading ? "Creating…" : "Create Account"}
          </button>
          <p className="text-xs text-center text-onyx-500">
            Already have an account?{" "}
            <Link href="/login" className="text-gold-500 hover:underline">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
