import { LockKeyhole } from "lucide-react"
import { NavLink } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { shelfNavigation } from "@/lib/navigation"

export function ShelfNavigation({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { status } = useAuth()
  return <nav aria-label="Shelves" className="shelf-navigation">
    {shelfNavigation.map(({ to, label, icon: Icon, requiresAuth }) => {
      const locked = requiresAuth && status === "anonymous"
      const accessibleLabel = locked ? `${label} — sign in required` : label
      return <NavLink key={to} to={to} end onClick={onNavigate} className="shelf-link"
        aria-label={compact ? accessibleLabel : undefined} title={compact ? accessibleLabel : undefined}>
        <Icon size={19} strokeWidth={1.65} aria-hidden="true" />
        <span className={compact ? "sr-only" : "shelf-label"}>{label}</span>
        {locked && !compact && <LockKeyhole size={13} aria-label="Sign in required" className="shelf-lock" />}
      </NavLink>
    })}
  </nav>
}
