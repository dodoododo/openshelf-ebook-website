import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider } from "@/providers/AuthProvider"
import { ThemeProvider } from "@/providers/ThemeProvider"
import { AppRoutes } from "@/routes"
import * as authService from "@/services/authService"
import { ApiRequestError } from "@/utils/apiErrors"

vi.mock("@/services/authService", () => ({ getCurrentUser: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() }))
vi.mock("@/services/healthService", () => ({ fetchBackendHealth: vi.fn().mockResolvedValue({ status: "UP" }) }))

function renderApp() {
  render(<ThemeProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><AuthProvider><AppRoutes /></AuthProvider></MemoryRouter>
  </QueryClientProvider></ThemeProvider>)
}

describe("shared application layout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null)
  })

  it("labels decorative content and sends guests through the existing protected route", async () => {
    renderApp()
    await screen.findByRole("link", { name: "Sign in" }, { timeout: 5000 })
    expect(screen.getByText("Illustrative covers · layout demo, not library data")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("link", { name: "See a shelf preview" }))
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "My Library" })).not.toBeInTheDocument()
  })

  it("filters only page navigation and has a clear empty state", async () => {
    renderApp()
    await userEvent.click(screen.getByRole("button", { name: "Search pages and shelves" }))
    const dialog = screen.getByRole("dialog")
    await userEvent.type(within(dialog).getByRole("searchbox"), "Favourites")
    expect(within(dialog).getByRole("link", { name: /Favourites/ })).toBeInTheDocument()
    expect(within(dialog).queryByRole("link", { name: /Finished/ })).not.toBeInTheDocument()
    await userEvent.clear(within(dialog).getByRole("searchbox"))
    await userEvent.type(within(dialog).getByRole("searchbox"), "missing page")
    expect(within(dialog).getByRole("status")).toHaveTextContent("No pages match")
  })

  it("shows the current user menu and surfaces logout failure without hiding the session", async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      id: "reader", displayName: "A Reader", email: "reader@example.com", role: "ROLE_USER", createdAt: "", updatedAt: "",
    })
    vi.mocked(authService.logout).mockRejectedValue(new ApiRequestError("Service unavailable", 503))
    renderApp()
    await userEvent.click(await screen.findByRole("button", { name: "Open account menu" }))
    expect(screen.getByText("reader@example.com")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable")
    expect(screen.getByRole("button", { name: "Open account menu" })).toBeInTheDocument()
  })
})
