import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import BottomNav from "../../components/BottomNav"

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
}

export default function CustomersList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    setLoading(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("You must be signed in to view customers.")
      setLoading(false)
      return
    }

    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (!membership) {
      setError("No business found for this account.")
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("business_id", membership.business_id)
      .order("name")

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setCustomers(data || [])
    setLoading(false)
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">tractbook</h1>
        <div className="w-8 h-8 rounded-full bg-blue-700 text-white text-xs font-semibold flex items-center justify-center">
          {"JS"}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => navigate("/estimates")}
          className="flex-1 text-center py-2 text-sm font-semibold text-gray-500"
        >
          Estimates
        </button>
        <button
          onClick={() => navigate("/invoices")}
          className="flex-1 text-center py-2 text-sm font-semibold text-gray-500"
        >
          Invoices
        </button>
        <button className="flex-1 text-center py-2 text-sm font-semibold text-blue-700 border-b-2 border-blue-700">
          Customers
        </button>
        <button
          onClick={() => navigate("/business")}
          className="flex-1 text-center py-2 text-sm font-semibold text-gray-500"
        >
          Business
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
        />
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => navigate("/coming-soon/import-customers")}
          className="flex-1 border border-blue-600 text-blue-700 rounded-lg py-2.5 text-sm font-semibold"
        >
          Import CSV
        </button>
        <button
          onClick={() => navigate("/customers/new")}
          className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-semibold"
        >
          + Add customer
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading customers...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm mb-2">
            {search ? "No customers match your search." : "No customers yet."}
          </p>
          {!search && (
            <p className="text-gray-400 text-xs">
              Add your first customer to start creating estimates and invoices.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/customers/${c.id}`)}
              className="border border-gray-200 rounded-lg px-4 py-3 flex flex-col cursor-pointer hover:border-blue-300"
            >
              <span className="font-semibold text-gray-900 text-sm">{c.name}</span>
              {c.email && <span className="text-gray-500 text-xs">{c.email}</span>}
            </div>
          ))}
        </div>
      )}
      <BottomNav active="sales" />
    </div>
  )
}







