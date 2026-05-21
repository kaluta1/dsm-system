import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Layout from "@/components/Layout"
import { useAuth, api, apiError } from "@/lib/api"
import toast from "react-hot-toast"
import { ShoppingBag, Zap, Package, TrendingUp, Check, ChevronDown } from "lucide-react"

interface ReservationOption {
  id: number; tier_pct: string; reservation_rate: string
  dsps_per_unit: string; usd_equivalent: string
}
interface Product {
  id: number; name: string; description: string; image_url: string
  supplier_price: string; deal_price: string; supplier_min_order: number
  global_min_order: number; dsc_ruling_rate: string; is_active: boolean
  reservation_options: ReservationOption[]
}

function tierLabel(pct: string | number): string {
  const v = Math.round(parseFloat(String(pct)) * 100)
  if (v >= 10000) return "10,000%"
  if (v >= 1000)  return `${(v / 1000).toFixed(0)},000%`
  return `${v}%`
}

function fmt(n: string | number, dec = 4) {
  return parseFloat(String(n)).toLocaleString(undefined, { maximumFractionDigits: dec, minimumFractionDigits: 2 })
}

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [option, setOption] = useState<ReservationOption | null>(null)
  const [units, setUnits] = useState(1)
  const [loading, setLoading] = useState(false)
  const [b14, setB14] = useState("0.10")
  const [b15, setB15] = useState(true)
  const [catalogOpen, setCatalogOpen] = useState(false)

  useEffect(() => {
    api.get("/products/").then(r => {
      setProducts(r.data)
      if (r.data.length > 0) setSelected(r.data[0])
    })
  }, [])

  useEffect(() => {
    if (selected?.reservation_options?.length) {
      setOption(selected.reservation_options[0])
    }
  }, [selected])

  const dspCost = option ? parseFloat(option.dsps_per_unit) * units : 0
  const usdEq   = option ? parseFloat(option.usd_equivalent) * units : 0

  async function handlePreorder() {
    if (!user) return router.push("/login")
    if (!selected || !option) return
    setLoading(true)
    try {
      await api.post("/preorders/", {
        product_id: selected.id,
        option_id: option.id,
        reserved_units: units,
        b14_supplier_dsp_pct: parseFloat(b14),
        b15_dme_fiat: b15,
      })
      toast.success("Pre-order placed successfully!")
      router.push("/dashboard")
    } catch (e: any) {
      toast.error(apiError(e))
    } finally {
      setLoading(false)
    }
  }

  if (products.length === 0) return (
    <Layout>
      <div className="flex items-center justify-center h-64 text-onyx-500">Loading…</div>
    </Layout>
  )

  return (
    <Layout>
      <div className="animate-fade-in">
        {/* Hero */}
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-mono text-gold-500 uppercase tracking-widest mb-2">Digital Shopping Mall</p>
          <h1 className="font-display text-2xl sm:text-4xl font-semibold text-white mb-2">
            Pre-order, <span className="text-gold-400">earn more</span>
          </h1>
          <p className="text-onyx-400 text-sm max-w-xl">
            Reserve products at a future price using your DSPs. The higher your reservation rate, the fewer DSPs you spend per unit.
          </p>
        </div>

        {/* ── Mobile product selector (dropdown) ── */}
        <div className="lg:hidden mb-4">
          <button onClick={() => setCatalogOpen(!catalogOpen)}
            className="w-full flex items-center justify-between bg-onyx-900 border border-onyx-800 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gold-500/20 flex items-center justify-center">
                <Package size={14} className="text-gold-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gold-400">{selected?.name}</p>
                <p className="text-xs font-mono text-onyx-500">${selected ? fmt(selected.deal_price, 2) : ""}</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-onyx-400 transition-transform ${catalogOpen ? "rotate-180" : ""}`} />
          </button>
          {catalogOpen && (
            <div className="mt-2 space-y-1.5">
              {products.filter(p => p.id !== selected?.id).map(p => (
                <button key={p.id} onClick={() => { setSelected(p); setCatalogOpen(false) }}
                  className="w-full text-left rounded-xl border border-onyx-800 bg-onyx-900 hover:border-onyx-700 p-3 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-onyx-800 flex items-center justify-center flex-shrink-0">
                      <Package size={14} className="text-onyx-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      <p className="text-xs font-mono text-onyx-500">${fmt(p.deal_price, 2)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

          {/* ── LEFT: Product catalogue (desktop only) ── */}
          <div className="hidden lg:block lg:col-span-3 space-y-2">
            <p className="text-xs font-mono text-onyx-500 uppercase tracking-widest mb-3">
              Products ({products.length})
            </p>
            {products.map(p => (
              <button key={p.id} onClick={() => setSelected(p)}
                className={`w-full text-left rounded-xl border p-3 transition-all
                  ${selected?.id === p.id
                    ? "bg-gold-500/5 border-gold-500/30"
                    : "bg-onyx-900 border-onyx-800 hover:border-onyx-700"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                    ${selected?.id === p.id ? "bg-gold-500/20" : "bg-onyx-800"}`}>
                    <Package size={14} className={selected?.id === p.id ? "text-gold-400" : "text-onyx-400"} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${selected?.id === p.id ? "text-gold-400" : "text-white"}`}>
                      {p.name}
                    </p>
                    <p className="text-xs font-mono text-onyx-500 mt-0.5">${fmt(p.deal_price, 2)}</p>
                  </div>
                </div>
                {selected?.id === p.id && (
                  <div className="mt-2 flex items-center gap-1 text-xs font-mono text-gold-500">
                    <Check size={10} /> selected
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* ── CENTER: Product detail ── */}
          {selected && (
            <div className="lg:col-span-5 space-y-4">
              <div className="card overflow-hidden">
                {/* Product image */}
                <div className="w-full h-36 sm:h-48 bg-onyx-800 rounded-lg mb-4 overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                      <Package size={32} className="text-gold-500/60 sm:hidden" />
                      <Package size={40} className="text-gold-500/60 hidden sm:block" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                    <span className="badge bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] sm:text-xs">
                      Available
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-semibold text-white">{selected.name}</h2>
                    <p className="text-onyx-400 text-xs sm:text-sm mt-1">{selected.description}</p>
                  </div>
                  <div className="sm:text-right sm:ml-4 flex-shrink-0">
                    <p className="text-xs font-mono text-onyx-500">Deal price</p>
                    <p className="font-display text-xl sm:text-2xl text-gold-400">${fmt(selected.deal_price, 2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
                  {[
                    { label: "Supplier", value: `$${fmt(selected.supplier_price, 2)}`, icon: Package },
                    { label: "DSC rate", value: `$${fmt(selected.dsc_ruling_rate, 4)}`, icon: TrendingUp },
                    { label: "Min.", value: `${selected.global_min_order} u.`, icon: Zap },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-onyx-800 rounded-lg p-2 sm:p-3">
                      <Icon size={12} className="text-gold-500 mb-1" />
                      <p className="text-[10px] sm:text-xs text-onyx-500 font-mono">{label}</p>
                      <p className="text-xs sm:text-sm font-semibold text-white mt-0.5 truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table 1(b) — Reservation tiers */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-display text-sm sm:text-base font-semibold text-white">Reservation Tiers</h3>
                  <span className="badge bg-onyx-800 text-onyx-400 border border-onyx-700 text-[10px] sm:text-xs">Table 1(b)</span>
                </div>
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-[10px] sm:text-xs font-mono" style={{ minWidth: "360px" }}>
                    <thead>
                      <tr className="border-b border-onyx-800">
                        {["Tier", "Rate", "DSPs/u.", "USD Eq."].map(h => (
                          <th key={h} className="text-left text-onyx-500 pb-2 pr-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.reservation_options.map((opt) => (
                        <tr key={opt.id}
                          onClick={() => setOption(opt)}
                          className={`table-row cursor-pointer ${option?.id === opt.id ? "bg-gold-500/5" : ""}`}>
                          <td className="py-2 pr-3">
                            <span className={`badge text-[10px] sm:text-xs ${option?.id === opt.id
                              ? "bg-gold-500/15 text-gold-400 border border-gold-500/30"
                              : "bg-onyx-800 text-onyx-300 border border-onyx-700"}`}>
                              {tierLabel(opt.tier_pct)}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-onyx-300">${fmt(opt.reservation_rate, 2)}</td>
                          <td className="py-2 pr-3 text-onyx-300">{fmt(opt.dsps_per_unit, 6)}</td>
                          <td className="py-2 text-onyx-300">${fmt(opt.usd_equivalent, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── RIGHT: Order panel ── */}
          {selected && (
            <div className="lg:col-span-4">
              <div className="card lg:sticky lg:top-24">
                <h3 className="font-display text-base sm:text-lg font-semibold text-white mb-4">Place a Pre-order</h3>

                {option && (
                  <div className="bg-gold-500/5 border border-gold-500/20 rounded-lg p-3 mb-4">
                    <p className="text-xs font-mono text-gold-500 mb-1">Selected tier</p>
                    <p className="text-sm text-white font-semibold">
                      {tierLabel(option.tier_pct)} of DSC rate
                      <span className="text-onyx-400 font-normal text-xs"> → {fmt(option.dsps_per_unit, 6)} DSPs/u.</span>
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="label">Quantity (units)</label>
                  <input type="number" min={1} value={units}
                    onChange={e => setUnits(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input" />
                </div>

                <div className="mb-4">
                  <label className="label">Supplier payment in DSPs — B14</label>
                  <select value={b14} onChange={e => setB14(e.target.value)} className="input">
                    <option value="0.00">0% (all fiat)</option>
                    <option value="0.10">10% DSPs</option>
                    <option value="0.25">25% DSPs</option>
                    <option value="0.50">50% DSPs</option>
                    <option value="1.00">100% DSPs</option>
                  </select>
                </div>

                <div className="mb-5">
                  <label className="label">DME Payment mode — B15</label>
                  <div className="flex gap-2">
                    {[{ val: true, label: "Fiat (USD)" }, { val: false, label: "DSPs" }].map(opt => (
                      <button key={String(opt.val)} onClick={() => setB15(opt.val)}
                        className={`flex-1 py-2 rounded-lg text-xs font-mono border transition-all
                          ${b15 === opt.val
                            ? "bg-gold-500/10 border-gold-500/30 text-gold-400"
                            : "border-onyx-700 text-onyx-400 hover:border-onyx-600"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-onyx-800 rounded-lg p-3 mb-5 space-y-2">
                  {[
                    { label: "Total (DSPs)", value: `${fmt(dspCost.toString(), 6)} DSP` },
                    { label: "USD equiv.",   value: `$${fmt(usdEq.toString(), 2)}` },
                    { label: "Available",    value: user ? `${fmt(user.dsp_balance, 6)} DSP` : "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-[10px] sm:text-xs font-mono text-onyx-500">{label}</span>
                      <span className="text-xs sm:text-sm font-mono text-white">{value}</span>
                    </div>
                  ))}
                </div>

                <button onClick={handlePreorder} disabled={loading || !option}
                  className="btn-gold w-full flex items-center justify-center gap-2">
                  <ShoppingBag size={14} />
                  {loading ? "Processing…" : "Confirm Pre-order"}
                </button>

                {!user && (
                  <p className="text-xs text-center text-onyx-500 mt-3">
                    <a href="/login" className="text-gold-500 hover:underline">Sign in</a> to place a pre-order
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
