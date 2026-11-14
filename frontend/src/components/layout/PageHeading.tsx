import type { ReactNode } from "react"
import { Link } from "react-router-dom"

export function PageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <header className="page-heading">
    <nav aria-label="Breadcrumb" className="page-breadcrumb"><Link to="/">OpenShelf</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>
    {children}<h1>{title}</h1><p>{description}</p>
  </header>
}
