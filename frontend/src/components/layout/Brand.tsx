import { Link } from "react-router-dom"

export function Brand() {
  return <Link to="/" className="brand" aria-label="OpenShelf home">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 8c-4-3-8-3-12-2v19c4-1 8-1 12 2 4-3 8-3 12-2V6c-4-1-8-1-12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M16 8v19M8 11c2 0 3 .4 4 1M20 12c1-1 2-1 4-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
    <span>OpenShelf<span className="brand-period">.</span></span>
  </Link>
}
