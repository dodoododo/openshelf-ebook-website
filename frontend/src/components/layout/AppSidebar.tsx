import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ShelfNavigation } from "./ShelfNavigation"
import { useAuth } from "@/hooks/useAuth"

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { status } = useAuth()
  return <aside className={`app-sidebar${collapsed ? " is-collapsed" : ""}`} aria-label="Library navigation">
    <div className="sidebar-heading"><span className="sidebar-caption">Your reading space</span>
      <Button variant="ghost" size="icon" className="sidebar-toggle" onClick={onToggle}
        aria-expanded={!collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
        {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
      </Button>
    </div>
    <div className="sidebar-expanded"><ShelfNavigation compact={collapsed} /></div>
    <div className="sidebar-rail"><ShelfNavigation compact /></div>
    <div className="sidebar-footer">
      {status === "anonymous" ? <>
        <p>A little space for<br />a world of stories.</p>
        <Button variant="outline" asChild><Link to="/register">Make yourself at home</Link></Button>
      </> : <p>One page at a time.</p>}
      <span className="sidebar-footnote">THE OPENSHELF READING ROOM</span>
    </div>
  </aside>
}
