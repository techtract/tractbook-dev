import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { needsSecondStep } from "../lib/mfa"

export default function AuthOnlyRoute() {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [secondStep, setSecondStep] = useState(false)
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setAuthenticated(!!data.session)
      setSecondStep(data.session ? await needsSecondStep() : false)
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

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

  return <Outlet />
}
