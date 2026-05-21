import { useEffect, useState } from "react"
import Layout from "@/components/Layout"
import { useAuth, api, apiError } from "@/lib/api"
import { useRouter } from "next/router"
import Link from "next/link"
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react"
import toast from "react-hot-toast"

interface Preorder {
  id: number; unique_id: number; product_id: number
  reserved_units: number; reserved_dsps: string; deal_price: string
  tier_pct: string; maturity_status: string; deal_status: string
  dsc_ruling_rate: string; original_reservation_rate: string
  current_reservation_rate: string; excess_dsps: string
  reservation_time: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  Waiting:        { label: "Waiting",          color: "bg-blue-500/10 text-blue-400 border-blue-500/20",    icon: Clock },
  Cancelled:      { label: "Cancelled",        color: "bg-red-500/10 text-red-400 border-red-500/20",       icon: XCircle },
  Closed:         { label: "Closed",           color: "bg-onyx-700 text-onyx-300 border-onyx-600",          icon: CheckCircle },
  Prepaid:        { label: "Prepaid",          color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: AlertCircle },
  Completed:      { label: "Completed",        color: "bg-green-500/10 text-green-400 border-green-500/20", icon: CheckCircle },
  SupplierFailed: { label: "Supplier Failed",  color: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: AlertCircle },
  DSMFailed:      { label: "DSM Failed",       color: "bg-red-500/10 text-red-400 border-red-500/20",       icon: XCircle },
}

function tierLabel(pct: string | number): string {
  const v = Math.round(parseFloat(String(pct)) * 100)
  if (v >= 10000) return "10,000%"
  if (v >= 1000)  return `${(v / 1000).toFixed(0)},000%`
  return `${v}%`
}

function fmt(n: string | number, dec = 2) {
  return parseFloat(String(n)).toLocaleString(undefined, { maximumFractionDigits: dec, minimumFractionDigits: 2 })
}

export default function Dashboard() {
  const { user, _hasHydrated } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Preorder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user) { router.push("/login"); return }
    api.get("/preorders/").then(r => { setOrders(r.data); setLoading(false) })
  }, [_hasHydrated, user])

  async function handleDelete(e: React.MouseEvent, orderId: number, uniqueId: number) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete Order #${uniqueId}? This will permanently remove the order and all its journal entries. Reserved DSPs will be refunded if the deal is not yet closed.`)) return
    try {
      const r = await api.delete(`/preorders/${orderId}`)
      toast.success(r.data.dsps_refunded && parseFloat(r.data.dsps_refunded) > 0
        ? `Order deleted, ${r.data.dsps_refunded} DSPs refunded`
        : "Order deleted")
      setOrders(orders.filter(o => o.id !== orderId))
    } catch (err: any) {
      toast.error(apiError(err))
    }
  }

  if (!_hasHydrated || !user || loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64 text-onyx-500">Loading…</div>
    </Layout>
  )

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="section-title">My Pre-orders</h1>
            <p className="text-sm text-onyx-500 mt-1">{orders.length} order(s) total</p>
          </div>
          <Link href="/" className="btn-gold">+ New Order</Link>
        </div>

        {orders.length === 0 ? (
          <div className="card text-center py-16">
            <FileText size={40} className="text-onyx-700 mx-auto mb-4" />
            <p className="text-onyx-400 font-display text-lg">No pre-orders yet</p>
            <p className="text-onyx-600 text-sm mt-2">Start by visiting the store</p>
            <Link href="/" className="btn-gold inline-flex mt-4">Browse Products</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const status = STATUS_CONFIG[order.deal_status] || STATUS_CONFIG.Waiting
              const StatusIcon = status.icon
              return (
                <Link key={order.id} href={`/preorders/${order.id}`}
                  className="card hover:border-gold-500/30 transition-all block group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-onyx-800 flex items-center justify-center">
                        <FileText size={16} className="text-gold-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white group-hover:text-gold-400 transition-colors">
                          Order #{order.unique_id}
                        </p>
                        <p className="text-xs font-mono text-onyx-500 mt-0.5">
                          {order.reserved_units} u. × Tier {tierLabel(order.tier_pct)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-onyx-500 font-mono">Reserved DSPs</p>
                        <p className="text-sm font-mono text-white">{fmt(order.reserved_dsps, 6)}</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-onyx-500 font-mono">Maturity</p>
                        <p className={`text-xs font-mono ${order.maturity_status === "Mature" ? "text-green-400" : "text-yellow-400"}`}>
                          {order.maturity_status}
                        </p>
                      </div>
                      <span className={`badge border ${status.color} flex items-center gap-1`}>
                        <StatusIcon size={10} />
                        {status.label}
                      </span>
                      <button
                        onClick={(e) => handleDelete(e, order.id, order.unique_id)}
                        title="Delete this order"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-onyx-800 hover:bg-red-500/20 text-onyx-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
