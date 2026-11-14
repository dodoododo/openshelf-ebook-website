import { Link } from "react-router-dom"
import { PageHeading } from "@/components/layout/PageHeading"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return <div className="page-content"><PageHeading title="A page out of place." description="We could not find that page. Let’s get you back to familiar shelves." /><Button asChild><Link to="/">Back to OpenShelf</Link></Button></div>
}
