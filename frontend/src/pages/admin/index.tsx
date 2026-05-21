import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "@/components/Layout"
import { useAuth, api, apiError } from "@/lib/api"
import toast from "react-hot-toast"
import Link from "next/link"
import { Users, Package, TrendingUp, Database, Plus, Zap, FlaskConical, Trash2 } from "lucide-react"

interface User { id: number; full_name: string; email: string; is_admin: boolean; dsp_balance: string; usd_balance: string }
interface Product { id: number; name: string; deal_price: string; dsc_ruling_rate: string; global_min_order: number; is_active: boolean }
interface CrystalStatus { crystallized: boolean; total_mature_waiting_units: number; global_min_order: number; product_name: string }

function fmt(n: string | number, dec = 2) {
  return parseFloat(String(n)).toLocaleString(undefined, { maximumFractionDigits: dec })
}


export default function AdminDashboard() {
  const { user, _hasHydrated } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [crystal, setCrystal] = useState<CrystalStatus | null>(null)
  const [topup, setTopup] = useState({ user_id: 0, dsp_amount: "", usd_amount: "" })
  const [newProduct, setNewProduct] = useState({ name: "", description: "", supplier_price: "", deal_price: "", supplier_min_order: "", dsc_ruling_rate: "" })
  const [newDscRate, setNewDscRate] = useState("")
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<"users"|"products"|"crystal">("users")
  const [seedResult, setSeedResult] = useState<any>(null)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user) { router.push("/login"); return }
    if (!user.is_admin) { router.push("/"); return }
    Promise.all([
      api.get("/admin/users"),
      api.get("/products/"),
    ]).then(([u, p]) => {
      setUsers(u.data)
      setProducts(p.data)
      if (p.data.length > 0) {
        api.get(`/admin/crystallization/${p.data[0].id}`).then(r => setCrystal(r.data))
      }
    })
  }, [_hasHydrated, user])

  async function handleTopUp() {
    setLoading(true)
    try {
      await api.post("/admin/topup", {
        user_id: topup.user_id,
        dsp_amount: topup.dsp_amount ? parseFloat(topup.dsp_amount) : undefined,
        usd_amount: topup.usd_amount ? parseFloat(topup.usd_amount) : undefined,
      })
      toast.success("Wallet topped up!")
      const u = await api.get("/admin/users")
      setUsers(u.data)
      setTopup({ user_id: 0, dsp_amount: "", usd_amount: "" })
    } catch (e: any) { toast.error(apiError(e)) }
    finally { setLoading(false) }
  }

  async function handleCreateProduct() {
    const sp = parseFloat(newProduct.supplier_price)
    const dp = parseFloat(newProduct.deal_price)
    const mo = parseInt(newProduct.supplier_min_order, 10)
    const dr = parseFloat(newProduct.dsc_ruling_rate)

    if (!newProduct.name.trim() || isNaN(sp) || isNaN(dp) || isNaN(mo) || isNaN(dr)) {
      toast.error("Please fill in all required fields")
      return
    }
    if (dp <= sp) {
      toast.error("Deal price must be greater than supplier price (margin = deal − supplier)")
      return
    }
    setLoading(true)
    try {
      await api.post("/products/", {
        name: newProduct.name.trim(),
        description: newProduct.description || null,
        supplier_price: sp,
        deal_price: dp,
        supplier_min_order: mo,
        dsc_ruling_rate: dr,
      })
      toast.success("Product created!")
      const p = await api.get("/products/")
      setProducts(p.data)
      setNewProduct({ name: "", description: "", supplier_price: "", deal_price: "", supplier_min_order: "", dsc_ruling_rate: "" })
    } catch (e: any) { toast.error(apiError(e)) }
    finally { setLoading(false) }
  }

  async function handleDscRateUpdate(productId: number) {
    if (!newDscRate) return
    setLoading(true)
    try {
      await api.put(`/products/${productId}/dsc-rate`, { product_id: productId, new_rate: parseFloat(newDscRate) })
      toast.success("DSC rate updated!")
      const [p, c] = await Promise.all([
        api.get("/products/"),
        api.get(`/admin/crystallization/${productId}`)
      ])
      setProducts(p.data); setCrystal(c.data); setNewDscRate("")
    } catch (e: any) { toast.error(apiError(e)) }
    finally { setLoading(false) }
  }

  async function handleDeleteProduct(productId: number, productName: string) {
    if (!confirm(`Delete product "${productName}"?\nAll related pre-orders will also be deleted. This cannot be undone.`)) return
    setLoading(true)
    try {
      await api.delete(`/admin/products/${productId}`)
      toast.success(`Product "${productName}" deleted`)
      const p = await api.get("/products/")
      setProducts(p.data)
    } catch (e: any) { toast.error(apiError(e)) }
    finally { setLoading(false) }
  }

  async function handleDeleteUser(userId: number, userName: string) {
    if (!confirm(`Delete user "${userName}"?\nAll their pre-orders will also be deleted. This cannot be undone.`)) return
    setLoading(true)
    try {
      await api.delete(`/admin/users/${userId}`)
      toast.success(`User "${userName}" deleted`)
      const u = await api.get("/admin/users")
      setUsers(u.data)
    } catch (e: any) { toast.error(apiError(e)) }
    finally { setLoading(false) }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      const r = await api.post("/admin/seed")
      setSeedResult(r.data.seed)
      toast.success("Seed completed!")
      const [u, p] = await Promise.all([api.get("/admin/users"), api.get("/products/")])
      setUsers(u.data); setProducts(p.data)
      if (p.data.length > 0) {
        api.get(`/admin/crystallization/${p.data[0].id}`).then(r => setCrystal(r.data))
      }
    } catch (e: any) { toast.error(apiError(e)) }
    finally { setSeeding(false) }
  }

  if (!_hasHydrated || !user?.is_admin) return null

  const TABS = [
    { id: "users" as const, label: "Users", icon: Users },
    { id: "products" as const, label: "Products", icon: Package },
    { id: "crystal" as const, label: "Crystallization", icon: Zap },
  ]

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <p className="text-xs font-mono text-gold-500 uppercase tracking-widest mb-1">Administration</p>
          <h1 className="section-title">Admin Panel</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Users", val: users.length, icon: Users },
            { label: "Active products", val: products.filter(p => p.is_active).length, icon: Package },
            { label: crystal ? (crystal.crystallized ? "✓ Crystallized" : "Not crystallized") : "—",
              val: crystal ? `${crystal.total_mature_waiting_units}/${crystal.global_min_order} u.` : "—",
              icon: TrendingUp },
          ].map(({ label, val, icon: Icon }) => (
            <div key={label} className="card flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gold-500/10 flex items-center justify-center">
                <Icon size={16} className="text-gold-500" />
              </div>
              <div>
                <p className="text-xs font-mono text-onyx-500">{label}</p>
                <p className="text-lg font-semibold text-white">{val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Seed */}
        <div className="card mb-6 border border-dashed border-onyx-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FlaskConical size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Test data — Sheet 1(b)</p>
                <p className="text-xs font-mono text-onyx-500">Vostro 7620 · DSC $50,000 · 20 u. @ 90% · B8=1</p>
              </div>
            </div>
            <button onClick={handleSeed} disabled={seeding} className="btn-outline text-xs py-2 px-4 flex items-center gap-2">
              <FlaskConical size={12} />
              {seeding ? "Running..." : "Initialize test data"}
            </button>
          </div>
          {seedResult && (
            <div className="mt-4 bg-onyx-900 rounded-lg p-3 text-xs font-mono space-y-1">
              {Object.entries(seedResult).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-gold-500 min-w-[80px]">{k}</span>
                  <span className="text-onyx-300">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-onyx-900 border border-onyx-800 rounded-lg p-1 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${tab === id ? "bg-gold-500 text-onyx-950" : "text-onyx-400 hover:text-onyx-100"}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* Utilisateurs */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-onyx-800">
                    {["#","Name","Email","Role","DSP Balance","USD Balance",""].map(h => (
                      <th key={h} className="text-left text-xs font-mono text-onyx-500 pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="table-row">
                      <td className="py-3 pr-4 text-onyx-500 font-mono text-xs">{u.id}</td>
                      <td className="py-3 pr-4 text-white font-medium">{u.full_name}</td>
                      <td className="py-3 pr-4 text-onyx-400 font-mono text-xs">{u.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`badge ${u.is_admin ? "bg-gold-500/10 text-gold-400 border-gold-500/20" : "bg-onyx-800 text-onyx-400 border-onyx-700"}`}>
                          {u.is_admin ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-onyx-200">{fmt(u.dsp_balance, 4)} DSP</td>
                      <td className="py-3 pr-4 font-mono text-onyx-200">${fmt(u.usd_balance)}</td>
                      <td className="py-3">
                        {u.id !== user?.id && (
                          <button onClick={() => handleDeleteUser(u.id, u.full_name)}
                            disabled={loading}
                            className="p-1.5 rounded-lg text-onyx-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete user">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top up form */}
            <div className="card">
              <h3 className="text-sm font-mono text-gold-500 uppercase tracking-wider mb-4">Top Up Wallet</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="label">User</label>
                  <select className="input" value={topup.user_id} onChange={e => setTopup({ ...topup, user_id: parseInt(e.target.value) })}>
                    <option value={0}>-- select --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">DSP Amount</label>
                  <input type="number" className="input" value={topup.dsp_amount}
                    onChange={e => setTopup({ ...topup, dsp_amount: e.target.value })}
                    placeholder="e.g. 1000000" />
                </div>
                <div>
                  <label className="label">USD Amount</label>
                  <input type="number" className="input" value={topup.usd_amount}
                    onChange={e => setTopup({ ...topup, usd_amount: e.target.value })}
                    placeholder="e.g. 500" />
                </div>
                <div className="flex items-end">
                  <button onClick={handleTopUp} disabled={loading || !topup.user_id} className="btn-gold w-full">
                    Top Up
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Produits */}
        {tab === "products" && (
          <div className="space-y-4">
            {products.length > 0 && (
              <div className="card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-onyx-800">
                      {["Name","Deal price","DSC rate","Global min.","Status","Action"].map(h => (
                        <th key={h} className="text-left text-xs font-mono text-onyx-500 pb-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} className="table-row">
                        <td className="py-3 pr-4 text-white font-medium">{p.name}</td>
                        <td className="py-3 pr-4 text-gold-400 font-mono">${fmt(p.deal_price)}</td>
                        <td className="py-3 pr-4 font-mono text-onyx-300">${fmt(p.dsc_ruling_rate, 6)}</td>
                        <td className="py-3 pr-4 font-mono text-onyx-300">{p.global_min_order} u.</td>
                        <td className="py-3 pr-4">
                          <span className={`badge ${p.is_active ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-onyx-800 text-onyx-500 border-onyx-700"}`}>
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2 items-center">
                            <input type="number" step="0.000001" className="input w-28 text-xs" value={newDscRate}
                              onChange={e => setNewDscRate(e.target.value)} placeholder="New rate" />
                            <button onClick={() => handleDscRateUpdate(p.id)}
                              disabled={loading} className="btn-outline text-xs py-1.5 px-3">
                              Update
                            </button>
                            <button onClick={() => handleDeleteProduct(p.id, p.name)}
                              disabled={loading}
                              className="p-1.5 rounded-lg text-onyx-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Delete product">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Create product */}
            <div className="card">
              <h3 className="text-sm font-mono text-gold-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus size={14} /> Create a product
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {[
                  { key: "name", label: "Product name", placeholder: "e.g. MacBook Pro", type: "text" },
                  { key: "description", label: "Description", placeholder: "Short description", type: "text" },
                  { key: "supplier_price", label: "Supplier price ($)", placeholder: "1500", type: "number", step: "0.01" },
                  { key: "deal_price", label: "Deal price ($) — auto +20%", placeholder: "1800", type: "number", step: "0.01", readOnly: true },
                  { key: "supplier_min_order", label: "Supplier min. order", placeholder: "100", type: "number", step: "1" },
                  { key: "dsc_ruling_rate", label: "Initial DSC rate ($)", placeholder: "0.01", type: "number", step: "0.000001" },
                ].map(({ key, label, placeholder, type, step, readOnly }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input className={`input ${readOnly ? "opacity-70 cursor-not-allowed" : ""}`}
                      placeholder={placeholder} type={type} step={step} readOnly={readOnly}
                      value={(newProduct as any)[key]}
                      onChange={e => {
                        const v = e.target.value
                        if (key === "supplier_price") {
                          const sp = parseFloat(v)
                          const dp = !isNaN(sp) && sp > 0 ? (sp * 1.2).toFixed(2) : ""
                          setNewProduct(prev => ({ ...prev, supplier_price: v, deal_price: dp }))
                        } else {
                          setNewProduct(prev => ({ ...prev, [key]: v }))
                        }
                      }} />
                  </div>
                ))}
              </div>
              <button onClick={handleCreateProduct} disabled={loading} className="btn-gold">
                Create product
              </button>
            </div>
          </div>
        )}

        {/* Cristallisation */}
        {tab === "crystal" && crystal && (
          <div className="card max-w-md">
            <h3 className="font-display text-lg text-white mb-4">Crystallization status</h3>
            <p className="text-onyx-400 text-sm mb-4">{crystal.product_name}</p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs font-mono text-onyx-500">Mature waiting units</span>
                <span className="font-mono text-white">{crystal.total_mature_waiting_units}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-mono text-onyx-500">Required minimum</span>
                <span className="font-mono text-white">{crystal.global_min_order}</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-onyx-800 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${crystal.crystallized ? "bg-green-500" : "bg-gold-500"}`}
                  style={{ width: `${Math.min(100, (crystal.total_mature_waiting_units / crystal.global_min_order) * 100)}%` }} />
              </div>
              <div className={`text-center py-3 rounded-lg font-display text-lg ${crystal.crystallized ? "bg-green-500/10 text-green-400" : "bg-onyx-800 text-onyx-400"}`}>
                {crystal.crystallized ? "✓ Deal Crystallized!" : "Awaiting crystallization"}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
