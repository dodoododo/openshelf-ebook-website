import { ArrowRight, ArrowUpRight, Library, SunMoon } from "lucide-react"
import { Link } from "react-router-dom"
import { ConnectionStatus } from "@/components/common/ConnectionStatus"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/hooks/useTheme"

export function HomePage() {
  const { status } = useAuth()
  const { preference, resolvedTheme, setTheme } = useTheme()
  return <div className="reading-room">
    <div className="room-meta"><span className="eyebrow">The OpenShelf reading room</span><Badge>Layout preview</Badge></div>
    <section className="room-hero" aria-labelledby="room-title">
      <div className="hero-copy">
        <h1 id="room-title">Read a little.<br /><em>Stay a while.</em></h1>
        <p>A quieter corner of the internet, made for the stories you love and the ones you have yet to find.</p>
        <div className="hero-actions">
          <Button asChild><Link to={status === "authenticated" ? "/account" : "/register"}>{status === "authenticated" ? "Your reading space" : "Join OpenShelf"}<ArrowRight size={16} aria-hidden="true" /></Link></Button>
          <a className="quiet-link" href="#layout-details">Take a look around<ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>
      </div>
      <figure className="book-illustration">
        <div className="book-scene" aria-hidden="true">
          <div className="book-cover cover-one"><strong>Margins<br />&amp; meadows</strong><svg width="40" height="44" viewBox="0 0 40 44" fill="none"><path d="M20 42V8m0 21C6 29 5 18 5 18s15-1 15 11Zm0-9C32 20 34 8 34 8S20 7 20 20Z" stroke="currentColor" /></svg><small>Field notes · Vol. I</small></div>
          <div className="book-cover cover-two"><small>A collection of moments</small><span className="cover-orbit" /><strong>The quiet<br /><em>hours</em></strong><small>OpenShelf Editions</small></div>
          <div className="book-cover cover-three"><strong>Small<br /><em>wonders</em></strong><span className="cover-sun" /><small>On everyday things</small></div>
        </div>
        <figcaption>Illustrative covers · layout demo, not library data</figcaption>
      </figure>
    </section>
    <section id="layout-details" className="layout-details" aria-labelledby="details-title">
      <div className="section-heading"><h2 id="details-title">Make room for reading.</h2><p>A first look at your OpenShelf space.</p></div>
      <div className="demo-cards">
        <Card className="demo-card"><Library size={24} strokeWidth={1.4} aria-hidden="true" /><h3>Your stories. Your shelves.</h3><p>A place to return to. Shelf navigation is ready to explore; book collections will follow in a later phase.</p><Button asChild variant="ghost"><Link to="/library">See a shelf preview<ArrowRight size={15} aria-hidden="true" /></Link></Button></Card>
        <Card className="demo-card"><SunMoon size={24} strokeWidth={1.4} aria-hidden="true" /><h3>Comfort in every light.</h3><p>Warm paper by day, forest ink by night. You’re viewing the {resolvedTheme} theme{preference === "system" ? ", following your device" : ""}.</p><Button variant="ghost" onClick={() => setTheme("system")} disabled={preference === "system"}>Use device setting<ArrowRight size={15} aria-hidden="true" /></Button></Card>
      </div>
    </section>
    <ConnectionStatus />
  </div>
}
