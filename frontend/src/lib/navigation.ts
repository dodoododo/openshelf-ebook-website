import { BookCheck, BookMarked, Compass, Heart, Library, PenLine } from "lucide-react"
import type { NavigationItem } from "@/types/navigation"

export const shelfNavigation: NavigationItem[] = [
  { label: "Discover", to: "/", icon: Compass, description: "The OpenShelf reading room" },
  { label: "My Library", to: "/library", icon: Library, description: "A home for your books", requiresAuth: true },
  { label: "Continue Reading", to: "/library/continue-reading", icon: BookMarked, description: "Pick up where you left off", requiresAuth: true },
  { label: "Finished", to: "/library/finished", icon: BookCheck, description: "Stories you have spent time with", requiresAuth: true },
  { label: "Favourites", to: "/library/favourites", icon: Heart, description: "Keep your favourites close", requiresAuth: true },
  { label: "My Published", to: "/library/published", icon: PenLine, description: "Your published work", requiresAuth: true },
]
