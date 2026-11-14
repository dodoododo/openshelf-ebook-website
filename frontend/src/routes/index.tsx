import { lazy, Suspense } from "react"
import { Routes, Route } from "react-router-dom"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { AccountPage } from "@/pages/AccountPage"
import { ProtectedRoute } from "./ProtectedRoute"
import { AppShell } from "@/components/layout/AppShell"
import { ShelfPreviewPage } from "@/pages/ShelfPreviewPage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { shelfNavigation } from "@/lib/navigation"
import { LibraryPage } from "@/pages/LibraryPage"

const ReaderPage = lazy(() => import("@/pages/ReaderPage").then((module) => ({ default: module.ReaderPage })))

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/read/:bookId" element={<Suspense fallback={<main className="reader-message" role="status">Opening reading space…</main>}><ReaderPage /></Suspense>} />
      </Route>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/library" element={<LibraryPage />} />
          {shelfNavigation.filter((item) => item.requiresAuth && item.to !== "/library").map((item) => <Route key={item.to} path={item.to} element={<ShelfPreviewPage />} />)}
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
