import { useEffect, useState } from "react"
import { ArrowUpRight, Search } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { shelfNavigation } from "@/lib/navigation"

export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey ||
        target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))) return
      event.preventDefault()
      setOpen(true)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
  const results = shelfNavigation.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery("") }}>
    <DialogTrigger asChild><Button variant="ghost" className="search-trigger" aria-label="Search pages and shelves">
      <Search size={18} aria-hidden="true" /><span>Search pages</span><kbd aria-hidden="true">/</kbd>
    </Button></DialogTrigger>
    <DialogContent>
      <DialogTitle className="dialog-title">Find your way</DialogTitle>
      <DialogDescription className="dialog-description">Jump to a page or shelf. Book search is coming later.</DialogDescription>
      <label htmlFor="page-search" className="sr-only">Search pages and shelves</label>
      <Input id="page-search" type="search" placeholder="Try ‘Favourites’" value={query} onChange={(event) => setQuery(event.target.value)} />
      <nav aria-label="Page search results" className="search-results">
        {results.map(({ to, label, description, icon: Icon }) => <Link key={to} to={to} onClick={() => setOpen(false)}>
          <Icon size={20} aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span><ArrowUpRight size={17} aria-hidden="true" />
        </Link>)}
        {results.length === 0 && <p role="status" className="py-6 text-sm text-muted-foreground">No pages match “{query}”. Try another name.</p>}
      </nav>
    </DialogContent>
  </Dialog>
}
