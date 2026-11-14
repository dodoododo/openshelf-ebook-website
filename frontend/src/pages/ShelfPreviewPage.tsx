import { Link, useLocation } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { PageHeading } from "@/components/layout/PageHeading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { shelfNavigation } from "@/lib/navigation"

export function ShelfPreviewPage() {
  const { pathname } = useLocation()
  const item = shelfNavigation.find((entry) => entry.to === pathname)
  if (!item) return null
  const Icon = item.icon
  return <div className="page-content">
    <PageHeading title={item.label} description={item.description}><Badge>Layout preview</Badge></PageHeading>
    <Card className="shelf-preview"><CardContent>
      <Icon size={36} strokeWidth={1.2} aria-hidden="true" />
      <h2>A space for the stories to come.</h2>
      <p>This is a navigation and layout preview. Your account is connected; book shelves and reading activity will arrive in a later phase.</p>
      {(pathname === "/library" || pathname === "/library/continue-reading") && <div className="my-6 rounded-lg border border-border bg-background p-5">
        <Badge>Reader prototype · browser-only progress</Badge>
        <h3 className="mt-3 font-serif text-2xl">A Quiet Place to Read</h3>
        <p className="mb-4">An original five-page CC0 sample. Open it to try the PDF reader and resume your locally saved page.</p>
        <Button asChild><Link to="/read/sample">Open sample reader</Link></Button>
      </div>}
      <Button asChild variant="outline"><Link to="/"><ArrowLeft size={16} aria-hidden="true" />Back to the reading room</Link></Button>
    </CardContent></Card>
  </div>
}
