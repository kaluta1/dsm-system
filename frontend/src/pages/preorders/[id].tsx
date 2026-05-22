import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "@/components/Layout"
import { useAuth, api, apiError } from "@/lib/api"
import toast from "react-hot-toast"
import { ChevronDown, ChevronUp, RefreshCw, Clock, Zap, AlertTriangle, Lock } from "lucide-react"

interface JournalEntry {
  id: number; event_type: string; account_name: string
  debit: string; credit: string; account_type: string
  currency: string; dsp_equivalent: string; note: string
}
interface Preorder {
  id: number; unique_id: number; reserved_units: number; tier_pct: string
  original_reservation_rate: string; current_reservation_rate: string
  dsc_ruling_rate: string
  reserved_dsps: string; reserved_dsps_per_unit: string
  requisite_dsps: string; dsps_needed_per_unit: string
  excess_dsps: string; deficiency_dsps: string; deals_value: string; suppliers_value: string
  deals_markup: string; deal_price: string; supplier_price: string
  min_order: number
  maturity_status: string; deal_status: string; crystallization_status: string
  reservation_time: string; updated_at: string
  b7_cancelled: boolean; b8_deal_closed: boolean; b9_supplier_failed: boolean
  b10_prepaid: boolean; b11_confirmed: boolean; b12_prepaid_confirmed: boolean
  b13_dsm_failed: boolean; b14_supplier_dsp_pct: string; b15_dme_fiat: boolean
  journal_entries: JournalEntry[]
}

const EVENT_LABELS: Record<string, string> = {
  ORIGINATION:        "Origination of reservation",
  CANCELLATION:       "Cancellation (B7)",
  CLOSURE:            "Deal Closure (B8)",
  SUPPLIER_FAILED:    "Supplier Failed (B9)",
  PREPAYMENT:         "Prepayment (B10)",
  COMPLETION:         "Completion (B11)",
  PREPAID_COMPLETION: "Prepaid Completion (B12)",
  DSM_FAILED:         "DSM Failed to Arbitrate (B13)",
}

const EVENT_DESCRIPTIONS: Record<string, string> = {
  ORIGINATION:        "When a member pays fiat currency to DSM to buy DSPs",
  CANCELLATION:       "When a preorderer cancels the deal",
  CLOSURE:            "When the reserved DSPs are sold to close the deal or when the supplier's deal that is fully payable by DSPs becomes crystallized",
  SUPPLIER_FAILED:    "When the supplier fails to deliver after the deal is closed",
  PREPAYMENT:         "When the system pays the supplier in advance",
  COMPLETION:         "Completing the crystallized deal after the buyer's confirmation of receipt of the product/service",
  PREPAID_COMPLETION: "When the preorderer confirms the receipt of the prepaid deal",
  DSM_FAILED:         "When DSM fails to judge the dispute",
}

const CONDITION_DESCRIPTIONS: Record<string, string> = {
  b7_cancelled:         "When a preorderer cancels the deal",
  b8_deal_closed:       "When the reserved DSPs are sold to close the deal or when the supplier's deal that is fully payable by DSPs becomes crystallized",
  b9_supplier_failed:   "When the supplier fails to deliver after the deal is closed",
  b10_prepaid:          "When the system pays the supplier in advance",
  b11_confirmed:        "When a preorderer confirms the receipt of the reserved product/service",
  b12_prepaid_confirmed:"When the preorderer confirms the receipt of the prepaid deal",
  b13_dsm_failed:       "When DSM fails to judge the dispute",
}

const STATUS_COLOR: Record<string, string> = {
  Waiting:        "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Cancelled:      "bg-red-500/10 text-red-400 border-red-500/20",
  Closed:         "bg-onyx-700 text-onyx-300 border-onyx-600",
  Prepaid:        "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Completed:      "bg-green-500/10 text-green-400 border-green-500/20",
  SupplierFailed: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DSMFailed:      "bg-red-500/10 text-red-400 border-red-500/20",
}

function n(v: string | number) { return parseFloat(String(v)) }
function fmt(v: string | number, dec = 4) {
  const f = n(v); if (isNaN(f)) return "—"
  return f.toLocaleString(undefined, { maximumFractionDigits: dec, minimumFractionDigits: Math.min(2, dec) })
}
function fmtDate(s: string) {
  if (!s) return "—"
  return new Date(s).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })
}
function tierLabel(pct: string | number): string {
  const v = Math.round(n(pct) * 100)
  if (v >= 10000) return "10,000%"
  if (v >= 1000)  return `${(v / 1000).toFixed(0)},000%`
  return `${v}%`
}

function VarRow({ code, label, formula, value, highlight, sub }: {
  code: string; label: string; formula: string; value: string; highlight?: boolean; sub?: boolean
}) {
  return (
    <tr className={`border-t border-onyx-800/60 ${highlight ? "bg-gold-500/3" : ""} ${sub ? "opacity-80" : ""}`}>
      <td className="px-3 py-2 font-mono text-xs font-bold text-gold-400 whitespace-nowrap">{code}</td>
      <td className="px-3 py-2 text-xs text-onyx-300">{label}</td>
      <td className="px-3 py-2 font-mono text-xs text-onyx-500 italic">{formula}</td>
      <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-white whitespace-nowrap">{value}</td>
    </tr>
  )
}

function ConditionSwitch({ label, description, value, onChange, disabled = false }: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <button onClick={() => !disabled && onChange(!value)} disabled={disabled}
      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border text-xs font-mono transition-all
        ${value ? "bg-gold-500/10 border-gold-500/30 text-gold-400" : "bg-onyx-800 border-onyx-700 text-onyx-400 hover:border-onyx-600"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
      <div className="text-left flex-1 mr-2">
        <span>{label}</span>
        {description && (
          <span className="block text-[10px] text-onyx-500 font-normal leading-tight mt-0.5">{description}</span>
        )}
      </div>
      <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${value ? "bg-gold-500 text-onyx-950 font-semibold" : "bg-onyx-700 text-onyx-500"}`}>
        {value ? "1" : "0"}
      </span>
    </button>
  )
}

function JournalBlock({ entries, event }: { entries: JournalEntry[]; event: string }) {
  const [open, setOpen] = useState(false)
  const filtered = entries.filter(e => e.event_type === event)
  if (filtered.length === 0) return null
  const isActive   = filtered.some(e => n(e.debit) > 0 || n(e.credit) > 0)
  const totalDspEq = filtered.reduce((s, e) => s + n(e.dsp_equivalent || "0"), 0)
  const balanced   = Math.abs(totalDspEq) < 0.01

  return (
    <div className={`rounded-lg border overflow-hidden ${isActive ? "border-gold-500/20" : "border-onyx-800"}`}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-onyx-800/50 transition-colors">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-gold-500" : "bg-onyx-700"}`} />
          <div className="flex flex-col items-start">
            <span className="text-sm font-mono text-onyx-200">{EVENT_LABELS[event]}</span>
            {EVENT_DESCRIPTIONS[event] && (
              <span className="text-[10px] text-onyx-500 font-normal leading-tight mt-0.5">{EVENT_DESCRIPTIONS[event]}</span>
            )}
          </div>
          {isActive && (
            <span className={`badge text-xs ${balanced ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
              {balanced ? "DR=CR ✓" : "Unbalanced ✗"}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-onyx-500" /> : <ChevronDown size={14} className="text-onyx-500" />}
      </button>

      {open && (
        <div className="border-t border-onyx-800 overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-onyx-900">
                {["Account", "Type", "Currency", "Debit", "Credit", "DSP Equiv."].map(h => (
                  <th key={h} className="text-left text-onyx-600 px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-t border-onyx-800/50 hover:bg-onyx-800/30">
                  <td className="px-4 py-2 text-onyx-300 max-w-xs truncate">{e.account_name}</td>
                  <td className="px-4 py-2 text-onyx-500">{e.account_type}</td>
                  <td className="px-4 py-2">
                    <span className={`badge ${e.currency === "DSP"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
                      {e.currency}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-onyx-200">{n(e.debit)  > 0 ? fmt(e.debit,  6) : "—"}</td>
                  <td className="px-4 py-2 text-right text-onyx-200">{n(e.credit) > 0 ? fmt(e.credit, 6) : "—"}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${n(e.dsp_equivalent) >= 0 ? "text-blue-300" : "text-orange-300"}`}>
                    {fmt(e.dsp_equivalent, 6)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-onyx-700 bg-onyx-900">
                <td colSpan={5} className="px-4 py-2 text-onyx-500 text-right font-semibold">Total DSP equivalent</td>
                <td className={`px-4 py-2 text-right font-bold ${balanced ? "text-green-400" : "text-red-400"}`}>
                  {fmt(totalDspEq, 6)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function PreorderDetail() {
  const router = useRouter()
  const { id } = router.query
  const { user, _hasHydrated } = useAuth()
  const [po, setPo] = useState<Preorder | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newDscRate, setNewDscRate] = useState("")
  const [b14Value, setB14Value] = useState("0.10")
  const [showDict, setShowDict] = useState(false)

  const load = async () => {
    if (!id) return
    const r = await api.get(`/preorders/${id}`)
    setPo(r.data)
    setB14Value(parseFloat(r.data.b14_supplier_dsp_pct).toFixed(2))
    setLoading(false)
  }

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user) { router.push("/login"); return }
    load()
  }, [id, _hasHydrated, user])

  async function updateConditions(patch: object) {
    if (!po || !user?.is_admin) return
    setSaving(true)
    try {
      const r = await api.put(`/preorders/${po.id}/conditions`, patch)
      setPo(r.data)
      toast.success("Journal regenerated")
    } catch (e: any) { toast.error(apiError(e)) }
    finally { setSaving(false) }
  }

  async function updateDscRate() {
    if (!newDscRate) return
    await updateConditions({ new_dsc_rate: parseFloat(newDscRate) })
    setNewDscRate("")
  }

  if (!po || loading) return (
    <Layout><div className="flex items-center justify-center h-64 text-onyx-500">Loading…</div></Layout>
  )

  const O    = n(po.reserved_dsps)
  const P    = n(po.requisite_dsps)
  const Q    = n(po.deals_value)
  const R    = n(po.suppliers_value)
  const S    = n(po.deals_markup)
  const T    = n(po.excess_dsps)
  const U    = n(po.deficiency_dsps)
  const H    = n(po.dsc_ruling_rate)
  const b14  = n(po.b14_supplier_dsp_pct)

  const ratio        = Q > 0 ? P / Q : 0
  const dsmRevenue   = S * ratio * 0.30
  const endorsement  = S * ratio * 0.20
  const membersPurch = S * ratio * 0.30
  const dfmPool      = S * ratio * 0.10
  const dmeDsp       = !po.b15_dme_fiat ? S * ratio * 0.10 : 0
  const dmeFiat      = po.b15_dme_fiat  ? S * 0.10 : 0
  const supplierFiat = R * (1 - b14)
  const supplierDsp  = Q > 0 ? R / Q * P * b14 : 0

  // Deal is frozen when any condition B8–B13 is active: no recompute of P, T, U, maturity or journal
  const dealFrozen = po.b8_deal_closed || po.b9_supplier_failed || po.b10_prepaid ||
                     po.b11_confirmed || po.b12_prepaid_confirmed || po.b13_dsm_failed

  const events = ["ORIGINATION","CANCELLATION","CLOSURE","SUPPLIER_FAILED","PREPAYMENT","COMPLETION","PREPAID_COMPLETION","DSM_FAILED"]

  return (
    <Layout>
      <div className="animate-fade-in max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-mono text-gold-500 uppercase tracking-widest mb-1">Pre-order</p>
            <h1 className="font-display text-3xl text-white">#{po.unique_id}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`badge border ${STATUS_COLOR[po.deal_status] || "bg-onyx-800 text-onyx-300 border-onyx-700"}`}>
                {po.deal_status}
              </span>
              <span className={`badge border ${po.maturity_status === "Mature"
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
                {po.maturity_status}
              </span>
              <span className={`badge border ${po.crystallization_status === "Crystallized"
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                : "bg-onyx-800 text-onyx-400 border-onyx-700"}`}>
                <Zap size={9} className="inline mr-1" />{po.crystallization_status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs font-mono text-onyx-500">
              <div className="flex items-center gap-1 justify-end"><Clock size={10} /> {fmtDate(po.reservation_time)}</div>
              {po.updated_at && <div className="mt-0.5 text-onyx-600">upd. {fmtDate(po.updated_at)}</div>}
            </div>
            <button onClick={load} className="btn-outline flex items-center gap-1.5 text-xs">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">

            {/* Deal variables */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm font-semibold text-white">
                  Deal Variables
                  <span className="ml-2 text-xs font-mono font-normal text-onyx-500">Data Dictionary</span>
                </h3>
                <button onClick={() => setShowDict(true)}
                  className="text-xs font-mono text-gold-500 hover:text-gold-400 transition-colors">
                  See detail →
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { code: "O", label: "Reserved DSPs (fixed)",    value: `${fmt(O, 6)} DSP`, hi: true  },
                  { code: "P", label: "Requisite DSPs (variable)", value: `${fmt(P, 6)} DSP`, hi: true  },
                  { code: "T", label: "Excess DSPs",               value: `${fmt(T, 6)} DSP`, hi: T > 0 },
                  { code: "U", label: "Deficiency DSPs",           value: `${fmt(U, 6)} DSP`, hi: false, warn: U > 0 },
                  { code: "Q", label: "Deal value",                value: `$${fmt(Q, 2)}`,    hi: false },
                  { code: "R", label: "Supplier value",            value: `$${fmt(R, 2)}`,    hi: false },
                  { code: "S", label: "Markup (Q − R)",            value: `$${fmt(S, 2)}`,    hi: true, warn: S <= 0 },
                ].map(v => (
                  <div key={v.code}
                    className={`rounded-lg p-3 border transition-colors
                      ${v.warn ? "bg-orange-500/5 border-orange-500/20"
                        : v.hi  ? "bg-gold-500/5 border-gold-500/15"
                        : "bg-onyx-800/40 border-onyx-800"}`}>
                    <span className={`text-xs font-mono font-bold ${v.warn ? "text-orange-400" : "text-gold-400"}`}>{v.code}</span>
                    <p className="font-mono text-sm font-semibold text-white mt-1">{v.value}</p>
                    <p className="text-xs text-onyx-500 mt-0.5">{v.label}</p>
                  </div>
                ))}
              </div>
              {S <= 0 && (
                <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <AlertTriangle size={13} className="text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-orange-300">
                    Markup S = 0 — DSM margin, DME and members{"'"} commissions will be zero.
                    Create a product with <code className="font-mono">deal_price &gt; supplier_price</code>.
                  </p>
                </div>
              )}
            </div>

            {/* Markup distribution */}
            <div className="card overflow-hidden p-0">
              <div className="px-4 py-3 border-b border-onyx-800">
                <h3 className="font-display text-sm font-semibold text-white">
                  Markup Distribution (S)
                  <span className="ml-2 text-xs font-mono font-normal text-onyx-500">= ${fmt(S, 2)}</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="bg-onyx-900">
                      {["Recipient", "% of S", "Formula", "Amount", "Currency"].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-onyx-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { dest: "DSM Revenue",             pct: "30%", formula: "S/Q×P×30%", val: dsmRevenue,   cur: "DSP" },
                      { dest: "Recommendation Commission", pct: "20%", formula: "S/Q×P×20%", val: endorsement,  cur: "DSP" },
                      { dest: "Purchase commissions (code 2130)", pct: "30%", formula: "S/Q×P×30%", val: membersPurch, cur: "DSP" },
                      { dest: "Leader Pool Monthly Payable (code 2160)",    pct: "10%", formula: "S/Q×P×10%", val: dfmPool,      cur: "DSP" },
                      { dest: "DME commission", pct: "10%",
                        formula: po.b15_dme_fiat ? "S×10%" : "S/Q×P×10%",
                        val: po.b15_dme_fiat ? dmeFiat : dmeDsp,
                        cur: po.b15_dme_fiat ? "USD" : "DSP" },
                    ].map(row => (
                      <tr key={row.dest} className="border-t border-onyx-800/60 hover:bg-onyx-800/20">
                        <td className="px-3 py-2.5 text-onyx-200">{row.dest}</td>
                        <td className="px-3 py-2.5 text-gold-400 font-semibold">{row.pct}</td>
                        <td className="px-3 py-2.5 italic text-onyx-500">{row.formula}</td>
                        <td className="px-3 py-2.5 text-right text-white font-semibold">{fmt(row.val, 6)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`badge ${row.cur === "DSP"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
                            {row.cur}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-onyx-700">
                      <td colSpan={5} className="px-3 py-1.5 text-onyx-600 bg-onyx-900/50">
                        Supplier escrow (B14 = {(b14 * 100).toFixed(0)}% DSP)
                      </td>
                    </tr>
                    {[
                      { dest: "Supplier (USD)", pct: `${((1-b14)*100).toFixed(0)}% of R`, formula: "R×(1−B14)", val: supplierFiat, cur: "USD" },
                      { dest: "Supplier (DSP)", pct: `${(b14*100).toFixed(0)}% of R`,     formula: "R/Q×P×B14", val: supplierDsp,  cur: "DSP" },
                    ].map(row => (
                      <tr key={row.dest} className="border-t border-onyx-800/60 hover:bg-onyx-800/20">
                        <td className="px-3 py-2.5 text-onyx-200">{row.dest}</td>
                        <td className="px-3 py-2.5 text-onyx-500">{row.pct}</td>
                        <td className="px-3 py-2.5 italic text-onyx-500">{row.formula}</td>
                        <td className="px-3 py-2.5 text-right text-white font-semibold">{fmt(row.val, 6)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`badge ${row.cur === "DSP"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
                            {row.cur}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conditions B7–B15 (read-only) */}
            <div className="card overflow-hidden p-0">
              <div className="px-4 py-3 border-b border-onyx-800">
                <h3 className="font-display text-sm font-semibold text-white">Conditions B7 – B15</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="bg-onyx-900">
                      {["Cond.", "Trigger", "Scope", "Value"].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-onyx-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { cond: "B7",  label: "When a preorderer cancels the deal",                 scope: "PREORDER", val: po.b7_cancelled,          type: "bool" },
                      { cond: "B8",  label: "When the reserved DSPs are sold to close the deal or when the supplier's deal that is fully payable by DSPs becomes crystallized", scope: "PRODUCT",  val: po.b8_deal_closed,        type: "bool" },
                      { cond: "B9",  label: "When the supplier fails to deliver after the deal is closed",           scope: "PRODUCT",  val: po.b9_supplier_failed,    type: "bool" },
                      { cond: "B10", label: "When the system pays the supplier in advance",             scope: "PRODUCT",  val: po.b10_prepaid,           type: "bool" },
                      { cond: "B11", label: "When a preorderer confirms the receipt of the reserved product/service",         scope: "PREORDER", val: po.b11_confirmed,         type: "bool" },
                      { cond: "B12", label: "When the preorderer confirms the receipt of the prepaid deal",     scope: "PREORDER", val: po.b12_prepaid_confirmed, type: "bool" },
                      { cond: "B13", label: "When DSM fails to judge the dispute",              scope: "PREORDER", val: po.b13_dsm_failed,        type: "bool" },
                      { cond: "B14", label: "Percentage of Supplier's payment in DSPs",          scope: "PRODUCT",  val: `${(b14 * 100).toFixed(0)}%`, type: "text" },
                      { cond: "B15", label: "DME payment option (0=DSP, 1=Fiat)",  scope: "PRODUCT",  val: po.b15_dme_fiat ? "1 — Fiat USD" : "0 — DSPs", type: "text" },
                    ].map(row => (
                      <tr key={row.cond} className="border-t border-onyx-800/60 hover:bg-onyx-800/20">
                        <td className="px-3 py-2.5 text-gold-400 font-bold whitespace-nowrap">{row.cond}</td>
                        <td className="px-3 py-2.5 text-onyx-300 text-[11px] leading-snug">{row.label}</td>
                        <td className="px-3 py-2.5">
                          <span className={`badge border text-xs ${row.scope === "PRODUCT"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                            {row.scope}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {row.type === "bool" ? (
                            <span className={`badge border ${row.val
                              ? "bg-gold-500/10 text-gold-400 border-gold-500/30"
                              : "bg-onyx-800 text-onyx-500 border-onyx-700"}`}>
                              {row.val ? "1 — Active" : "0"}
                            </span>
                          ) : (
                            <span className="text-white">{row.val as string}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Accounting Journal */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-semibold text-white">
                  Accounting Journal
                  <span className="ml-2 text-xs font-mono font-normal text-onyx-500">As Transactions</span>
                </h3>
                <span className="text-xs font-mono text-onyx-500">{po.journal_entries.length} entr(ies)</span>
              </div>
              <div className="space-y-2">
                {events.map(ev => (
                  <JournalBlock key={ev} entries={po.journal_entries} event={ev} />
                ))}
              </div>
            </div>

          </div>

          {/* Right panel */}
          <div className="space-y-4">

            {/* Summary */}
            <div className="card">
              <h3 className="text-xs font-mono text-onyx-400 uppercase tracking-wider mb-3">Summary</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Units",        val: `${po.reserved_units} u.` },
                  { label: "Tier",         val: `${tierLabel(po.tier_pct)} of rate` },
                  { label: "H (DSC rate)", val: `$${fmt(H, 8)}` },
                  { label: "H₀ (original)",val: `$${fmt(n(po.original_reservation_rate), 8)}` },
                  { label: "Min. order",   val: `${po.min_order} u.` },
                  { label: "O (reserved)", val: `${fmt(O, 6)} DSP` },
                  { label: "P (requisite)",val: `${fmt(P, 6)} DSP` },
                  { label: "T (excess)",   val: T > 0 ? `${fmt(T, 6)} DSP` : "0 DSP",
                    color: T > 0 ? "text-green-400" : "text-onyx-500" },
                  { label: "U (deficiency)", val: U > 0 ? `${fmt(U, 6)} DSP` : "0 DSP",
                    color: U > 0 ? "text-red-400" : "text-onyx-500" },
                  { label: "S (markup)",   val: `$${fmt(S, 2)}`,
                    color: S > 0 ? "text-gold-400" : "text-orange-400" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs font-mono text-onyx-500">{label}</span>
                    <span className={`text-xs font-mono font-semibold ${color || "text-white"}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {user?.is_admin && (
              <>
                {/* Update DSC rate */}
                <div className="card">
                  <h3 className="text-xs font-mono text-gold-500 uppercase tracking-wider mb-3">Update DSC Rate (H)</h3>
                  {dealFrozen && (
                    <div className="mb-3 flex items-start gap-2 px-3 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Lock size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-300 leading-snug">
                        Deal <b>frozen</b> — accounting data locked because a condition (B8–B13) is active.
                        DSC rate changes will not recompute P, T, U, maturity or journal entries.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="number" step="0.000001" className="input flex-1 text-sm" value={newDscRate}
                      onChange={e => setNewDscRate(e.target.value)} placeholder={`current: $${fmt(H, 8)}`}
                      disabled={dealFrozen} />
                    <button onClick={updateDscRate} disabled={!newDscRate || saving || dealFrozen} className="btn-gold px-3 text-sm">OK</button>
                  </div>
                  <p className="text-xs font-mono text-onyx-600 mt-2">
                    {dealFrozen ? "Frozen — values locked" : "Recalculates P, T, maturity and journal"}
                  </p>
                </div>

                {/* Conditions B7–B13 */}
                <div className="card">
                  <h3 className="text-xs font-mono text-gold-500 uppercase tracking-wider mb-3">Conditions (B7–B13)</h3>
                  {po.maturity_status === "Immature" && (
                    <div className="mb-3 flex items-start gap-2 px-3 py-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <AlertTriangle size={13} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-300 leading-snug">
                        Deal <b>Immature</b> — conditions B7–B13 locked.
                        Update the DSC rate above to make the deal Mature first.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {[
                      { key: "b7_cancelled",         label: "B7 — Cancellation" },
                      { key: "b8_deal_closed",        label: "B8 — Deal Closed" },
                      { key: "b9_supplier_failed",    label: "B9 — Supplier KO" },
                      { key: "b10_prepaid",           label: "B10 — Prepayment" },
                      { key: "b11_confirmed",         label: "B11 — Confirmed" },
                      { key: "b12_prepaid_confirmed", label: "B12 — Prepaid Confirmed" },
                      { key: "b13_dsm_failed",        label: "B13 — DSM Failed" },
                    ].map(({ key, label }) => (
                      <ConditionSwitch key={key} label={label}
                        description={CONDITION_DESCRIPTIONS[key]}
                        value={(po as any)[key]}
                        onChange={v => updateConditions({ [key]: v })}
                        disabled={saving || po.maturity_status === "Immature"} />
                    ))}
                  </div>
                </div>

                {/* B14 & B15 */}
                <div className="card">
                  <h3 className="text-xs font-mono text-gold-500 uppercase tracking-wider mb-3">Config (B14–B15)</h3>
                  <div className="mb-3">
                    <label className="label">B14 — % supplier in DSPs</label>
                    <div className="flex gap-2">
                      <select value={b14Value} onChange={e => setB14Value(e.target.value)} className="input flex-1 text-sm">
                        <option value="0.00">0% (all fiat)</option>
                        <option value="0.10">10%</option>
                        <option value="0.25">25%</option>
                        <option value="0.50">50%</option>
                        <option value="1.00">100% DSPs</option>
                      </select>
                      <button onClick={() => updateConditions({ b14_supplier_dsp_pct: parseFloat(b14Value) })}
                        disabled={saving} className="btn-gold px-3 text-sm">OK</button>
                    </div>
                  </div>
                  <div>
                    <label className="label">B15 — DME Payment</label>
                    <div className="flex gap-2">
                      {[{ val: false, label: "0 — DSPs" }, { val: true, label: "1 — Fiat (USD)" }].map(opt => (
                        <button key={String(opt.val)}
                          onClick={() => updateConditions({ b15_dme_fiat: opt.val })}
                          disabled={saving}
                          className={`flex-1 py-2 rounded-lg text-xs font-mono border transition-all
                            ${po.b15_dme_fiat === opt.val
                              ? "bg-gold-500/10 border-gold-500/30 text-gold-400"
                              : "border-onyx-700 text-onyx-400 hover:border-onyx-600"}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Data Dictionary Dialog */}
      {showDict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDict(false)} />
          <div className="relative bg-onyx-950 border border-onyx-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-onyx-800 flex-shrink-0">
              <div>
                <h2 className="font-display text-lg text-white">Data Dictionary</h2>
                <p className="text-xs font-mono text-onyx-500 mt-0.5">Variables — "As Transactions" sheet</p>
              </div>
              <button onClick={() => setShowDict(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-onyx-800 hover:bg-onyx-700 text-onyx-400 hover:text-white transition-colors text-xl leading-none">
                ×
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 bg-onyx-950 z-10">
                  <tr className="border-b border-onyx-800">
                    {["Var.", "Label", "Formula", "Value"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-mono text-onyx-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <VarRow code="n"   label="Reserved units"               formula="input"                  value={`${po.reserved_units} u.`} />
                  <VarRow code="H"   label="Current DSC rate (ruling)"    formula="H4 — admin"             value={`$${fmt(H, 8)}`} highlight />
                  <VarRow code="H₀"  label="Original reservation rate"    formula="tier_pct × H_initial"   value={`$${fmt(n(po.original_reservation_rate), 8)}`} />
                  <VarRow code="H₁"  label="Current reservation rate"     formula="tier_pct × H"           value={`$${fmt(n(po.current_reservation_rate), 8)}`} />
                  <VarRow code="tier" label="Selected tier"               formula="%"                      value={tierLabel(po.tier_pct)} sub />
                  <VarRow code="deal$" label="Deal price"                 formula="admin"                  value={`$${fmt(n(po.deal_price), 2)}`} sub />
                  <VarRow code="supp$" label="Supplier price"             formula="admin"                  value={`$${fmt(n(po.supplier_price), 2)}`} sub />
                  <VarRow code="DSPs₀" label="DSPs/unit reserved (tier)" formula="deal_price ÷ H₀"        value={`${fmt(n(po.reserved_dsps_per_unit), 6)} DSP`} sub />
                  <VarRow code="DSPsₙ" label="DSPs/unit requisite (H)"   formula="deal_price ÷ H"         value={`${fmt(n(po.dsps_needed_per_unit), 6)} DSP`} sub />
                  <VarRow code="O"  label="Total reserved DSPs (fixed)"  formula="n × (deal_price ÷ H₀)"  value={`${fmt(O, 6)} DSP`} highlight />
                  <VarRow code="P"  label="Requisite DSPs (current H)"   formula="n × (deal_price ÷ H)"   value={`${fmt(P, 6)} DSP`} highlight />
                  <VarRow code="Q"  label="Total deal value"             formula="n × deal_price"          value={`$${fmt(Q, 2)}`} />
                  <VarRow code="R"  label="Total supplier value"         formula="n × supplier_price"      value={`$${fmt(R, 2)}`} />
                  <VarRow code="S"  label="Markup (Q − R)"               formula="Q − R"                   value={`$${fmt(S, 2)}`} highlight />
                  <VarRow code="T"  label="Excess DSPs"                  formula="max(O − P, 0)"           value={T > 0 ? `${fmt(T, 6)} DSP` : "0 DSP"} highlight />
                  <VarRow code="U"  label="Deficiency DSPs"              formula="max(P − O, 0)"           value={U > 0 ? `${fmt(U, 6)} DSP` : "0 DSP"} highlight />
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-onyx-800 flex-shrink-0 flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono text-onyx-500">Maturity:</span>
              <code className="text-xs font-mono text-onyx-300">
                H₀ {n(po.original_reservation_rate) <= n(po.current_reservation_rate) ? "≤" : ">"} H₁
              </code>
              <span className={`badge border ${po.maturity_status === "Mature"
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
                {po.maturity_status}
              </span>
              <span className="ml-auto text-xs font-mono text-onyx-600">
                ratio P/Q = {fmt(Q > 0 ? P / Q : 0, 6)}
              </span>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
