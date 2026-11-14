import { useEffect, useRef, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AppHeader } from "./AppHeader"
import { AppSidebar } from "./AppSidebar"

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    if (previousPath.current !== pathname) {
      main.current?.focus()
      window.scrollTo(0, 0)
      previousPath.current = pathname
    }
  }, [pathname])
  return <div className="app-shell">
    <AppHeader />
    <div className="app-frame">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <main id="main-content" ref={main} tabIndex={-1} className="app-main"><Outlet /></main>
    </div>
  </div>
}
