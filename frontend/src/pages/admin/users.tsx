import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "@/components/Layout"
import { useAuth, api, apiError } from "@/lib/api"
import toast from "react-hot-toast"
import { Users, Wallet, Plus, Shield, Trash2 } from "lucide-react"

interface User {
  id: number
  full_name: string
  email: string
  is_admin: boolean
  dsp_balance: string
  usd_balance: string
}

function fmt(n: string | number, dec = 2) {
  return parseFloat(String(n)).toLocaleString(undefined, { maximumFractionDigits: dec, minimumFractionDigits: Math.min(2, dec) })
}

export default function AdminUsers() {
  const { user, _hasHydrated } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)
  const [dspAmount, setDspAmount] = useState("")
  const [usdAmount, setUsdAmount] = useState("")

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user) { router.push("/login"); return }
    if (!user.is_admin) { router.push("/"); return }
    api.get("/admin/users").then(r => { setUsers(r.data); setLoading(false) })
  }, [_hasHydrated, user])

  async function handleTopUp() {
    if (!selected) return
    const dsp = dspAmount ? parseFloat(dspAmount) : undefined
    const usd = usdAmount ? parseFloat(usdAmount) : undefined

    if (!dsp && !usd) {
      toast.error("Enter a DSP or USD amount")
      return
    }
    if ((dsp !== undefined && isNaN(dsp)) || (usd !== undefined && isNaN(usd))) {
      toast.error("Invalid amount")
      return
    }

    setSaving(true)
    try {
      const { data: updated } = await api.post("/admin/topup", {
        user_id: selected.id,
        dsp_amount: dsp,
        usd_amount: usd,
      })
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
      setSelected(updated)
      setDspAmount("")
      setUsdAmount("")
      toast.success(`${updated.full_name}'s wallet topped up!`)
    } catch (e: any) { toast.error(apiError(e)) }
    finally { setSaving(false) }
  }

  async function handleDeleteUser(u: User) {
    if (!confirm(`Delete user "${u.full_name}" (${u.email})?\nAll their pre-orders will also be deleted. This cannot be undone.`)) return
    setSaving(true)
    try {
      await api.delete(`/admin/users/${u.id}`)
      setUsers(prev => prev.filter(x => x.id !== u.id))
      if (selected?.id === u.id) setSelected(null)
      toast.success(`User "${u.full_name}" deleted`)
    } catch (e: any) { toast.error(apiError(e)) }
    finally { setSaving(false) }
  }

  if (!_hasHydrated || !user?.is_admin) return null

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <p className="text-xs font-mono text-gold-500 uppercase tracking-widest mb-1">Administration</p>
          <h1 className="section-title flex items-center gap-2">
            <Users size={22} className="text-gold-500" /> User Management
          </h1>
          <p className="text-sm text-onyx-500 mt-1">{users.length} registered user(s)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste users */}
          <div className="lg:col-span-2">
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-onyx-800">
                    {["#", "Name", "Email", "Role", "DSP", "USD", ""].map(h => (
                      <th key={h} className="text-left text-xs font-mono text-onyx-500 pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="py-8 text-center text-onyx-500 text-xs">Loading...</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id}
                      onClick={() => { setSelected(u); setDspAmount(""); setUsdAmount("") }}
                      className={`table-row cursor-pointer transition-colors ${selected?.id === u.id ? "bg-gold-500/5" : ""}`}>
                      <td className="py-3 pr-4 text-onyx-500 font-mono text-xs">{u.id}</td>
                      <td className="py-3 pr-4 font-medium text-white">{u.full_name}</td>
                      <td className="py-3 pr-4 text-onyx-400 font-mono text-xs">{u.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`badge ${u.is_admin
                          ? "bg-gold-500/10 text-gold-400 border-gold-500/20"
                          : "bg-onyx-800 text-onyx-400 border-onyx-700"}`}>
                          {u.is_admin ? <><Shield size={9} className="inline mr-1" />Admin</> : "User"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-onyx-200 text-xs">
                        {fmt(u.dsp_balance, 0)} DSP
                      </td>
                      <td className="py-3 font-mono text-onyx-200 text-xs">
                        ${fmt(u.usd_balance)}
                      </td>
                      <td className="py-3">
                        {u.id !== user?.id && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(u) }}
                            disabled={saving}
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
          </div>

          {/* Panel top-up */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <Wallet size={14} className="text-gold-500" />
                <h3 className="text-sm font-mono text-gold-500 uppercase tracking-wider">Top Up Wallet</h3>
              </div>

              {selected ? (
                <>
                  <div className="bg-onyx-800 rounded-lg p-3 mb-4">
                    <p className="text-xs text-onyx-500 font-mono mb-1">Selected user</p>
                    <p className="text-white font-medium">{selected.full_name}</p>
                    <p className="text-onyx-400 text-xs font-mono mt-0.5">{selected.email}</p>
                    <div className="flex gap-4 mt-2">
                      <div>
                        <p className="text-xs text-onyx-500 font-mono">DSP</p>
                        <p className="text-sm font-mono text-gold-400">{fmt(selected.dsp_balance, 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-onyx-500 font-mono">USD</p>
                        <p className="text-sm font-mono text-onyx-200">${fmt(selected.usd_balance)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="label flex items-center gap-1">
                        <Plus size={11} className="text-gold-500" /> DSP amount to add
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        className="input"
                        placeholder="e.g. 1,000,000"
                        value={dspAmount}
                        onChange={e => setDspAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label flex items-center gap-1">
                        <Plus size={11} className="text-gold-500" /> USD amount to add
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input"
                        placeholder="ex: 500"
                        value={usdAmount}
                        onChange={e => setUsdAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleTopUp}
                    disabled={saving || (!dspAmount && !usdAmount)}
                    className="btn-gold w-full flex items-center justify-center gap-2">
                    <Wallet size={13} />
                    {saving ? "Processing..." : "Top up wallet"}
                  </button>

                  <button
                    onClick={() => setSelected(null)}
                    className="mt-2 w-full text-xs text-onyx-500 hover:text-onyx-300 transition-colors py-1">
                    Deselect
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <Users size={32} className="text-onyx-700 mx-auto mb-3" />
                  <p className="text-onyx-500 text-sm">Click on a user</p>
                  <p className="text-onyx-600 text-xs mt-1">to top up their wallet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
