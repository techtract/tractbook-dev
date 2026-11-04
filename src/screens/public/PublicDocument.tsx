import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import PrintInvoice from "../sales/PrintInvoice"
import PrintEstimate from "../sales/PrintEstimate"

type Loaded = {
  type: "invoice" | "estimate"
  document: any
  customer: any
  business: any
  items: any[]
  paidTotal: number
}

// Public page a customer opens from the email. No login. Read-only, printable.
export default function PublicDocument() {
  const { type, token } = useParams<{ type: string; token: string }>()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Customers open this on any screen: drop the phone-frame look used inside the app.
  useEffect(() => {
    document.body.classList.add("public-doc")
    return () => document.body.classList.remove("public-doc")
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-document?type=${encodeURIComponent(type || "")}&token=${encodeURIComponent(token || "")}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } }
        )
        if (!res.ok) {
          setNotFound(true)
          return
        }
        setLoaded(await res.json())
      } catch {
        setNotFound(true)
      }
    }
    load()
  }, [type, token])

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-sm text-gray-500">This link is not valid, or the document is no longer available.</p>
      </div>
    )
  }
  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500 text-sm">Loading...</p></div>
  }
  return loaded.type === "invoice" ? <PrintInvoice data={loaded} /> : <PrintEstimate data={loaded} />
}
