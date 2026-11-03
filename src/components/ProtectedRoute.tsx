import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { needsSecondStep } from "../lib/mfa"

export default function ProtectedRoute() {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [onboarded, setOnboarded] = useState(false)
  const [secondStep, setSecondStep] = useState(false)
  const location = useLocation()

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
    setSecondStep(await needsSecondStep())

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

  if (secondStep) {
    return <Navigate to="/verify-2fa" replace state={{ from: location.pathname, fromState: location.state }} />
  }

  if (!onboarded) {
    return <Navigate to="/verify-phone" replace />
  }

  return <Outlet />
}
