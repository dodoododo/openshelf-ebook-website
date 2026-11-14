import { useEffect, useState } from "react"
import { Menu } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/useAuth"
import { Brand } from "./Brand"
import { ShelfNavigation } from "./ShelfNavigation"

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const { status } = useAuth()
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)")
    const closeOnDesktop = (event: MediaQueryListEvent) => { if (event.matches) setOpen(false) }
    media.addEventListener("change", closeOnDesktop)
    return () => media.removeEventListener("change", closeOnDesktop)
  }, [])
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="ghost" size="icon" className="mobile-menu-trigger" aria-label="Open navigation"><Menu aria-hidden="true" /></Button></DialogTrigger>
    <DialogContent variant="drawer">
      <Brand />
      <DialogTitle className="drawer-title">Navigation</DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground">Your reading space, wherever you are.</DialogDescription>
      <ShelfNavigation onNavigate={() => setOpen(false)} />
      {status === "anonymous" && <div className="drawer-account">
        <p className="text-sm text-muted-foreground">Sign in to make these shelves your own.</p>
        <Button asChild><Link to="/register" onClick={() => setOpen(false)}>Create account</Link></Button>
        <Button variant="outline" asChild><Link to="/login" onClick={() => setOpen(false)}>Sign in</Link></Button>
      </div>}
    </DialogContent>
  </Dialog>
}
