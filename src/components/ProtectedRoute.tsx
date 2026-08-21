import { useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function ProtectedRoute() {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [onboarded, setOnboarded] = useState(false)

  useEffect(() => {
    checkAccess()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthenticated(false)
        setOnboarded(false)
      } else {
        checkAccess()
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function checkAccess() {
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session

    if (!session) {
      setAuthenticated(false)
      setOnboarded(false)
      setChecking(false)
      return
    }

    setAuthenticated(true)

    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    setOnboarded(!!membership)
    setChecking(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  if (!onboarded) {
    return <Navigate to="/verify-phone" replace />
  }

  return <Outlet />
}
