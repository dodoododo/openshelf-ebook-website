import { useState } from "react"
import { ChevronDown, LogOut, RefreshCw, UserRound } from "lucide-react"
import { Link, NavLink } from "react-router-dom"
import { ThemeToggle } from "@/components/common/ThemeToggle"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/useAuth"
import { toApiError } from "@/utils/apiErrors"
import { Brand } from "./Brand"
import { MobileNav } from "./MobileNav"
import { SearchDialog } from "./SearchDialog"

export function AppHeader() {
  const { user, status, logout, isPending, retrySession } = useAuth()
  const [error, setError] = useState("")
  return <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="app-header">
      <MobileNav /><Brand />
      <nav aria-label="Main" className="header-navigation">
        <NavLink to="/" end>Discover</NavLink><NavLink to="/library">My Library</NavLink>
      </nav>
      <div className="header-actions"><SearchDialog /><ThemeToggle />
        {status === "loading" && <span role="status" className="account-pending">Checking session…</span>}
        {status === "error" && <Button className="account-retry" variant="outline" size="sm" onClick={retrySession} aria-label="Retry account"><RefreshCw aria-hidden="true" /><span>Retry account</span></Button>}
        {status === "anonymous" && <div className="guest-actions"><Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button><Button asChild><Link to="/register">Join OpenShelf</Link></Button></div>}
        {status === "authenticated" && user && <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="account-trigger" aria-label="Open account menu">
            <span className="user-avatar" aria-hidden="true">{user.displayName.slice(0, 1).toUpperCase()}</span>
            <span className="account-first-name">{user.displayName.split(/\s/)[0]}</span><ChevronDown size={14} aria-hidden="true" />
          </Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel><strong>{user.displayName}</strong><span className="menu-email">{user.email}</span></DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/account"><UserRound size={17} aria-hidden="true" />Your account</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/library">Your shelves</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={isPending} onSelect={async () => {
              setError("")
              try { await logout() } catch (failure) { setError(toApiError(failure).message) }
            }}><LogOut size={17} aria-hidden="true" />Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>}
      </div>
    </header>
    {error && <div className="header-error" role="alert">{error}<Button variant="ghost" size="sm" onClick={() => setError("")}>Dismiss</Button></div>}
  </>
}
