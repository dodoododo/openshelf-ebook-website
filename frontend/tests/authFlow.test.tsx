import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider } from "@/providers/AuthProvider"
import { AppRoutes } from "@/routes"
import * as authService from "@/services/authService"
import type { User } from "@/types/auth"
import { ApiRequestError } from "@/utils/apiErrors"
import { ThemeProvider } from "@/providers/ThemeProvider"

vi.mock("@/services/authService", () => ({
  getCurrentUser: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn(),
}))

const user: User = {
  id: "user-1", email: "reader@example.com", displayName: "Test Reader", role: "ROLE_USER",
  createdAt: "2026-11-12T00:00:00Z", updatedAt: "2026-11-12T00:00:00Z",
}

function renderApp(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>
    <ThemeProvider><AuthProvider><AppRoutes /></AuthProvider></ThemeProvider>
  </MemoryRouter></QueryClientProvider>)
  return client
}

describe("authentication pages and session state", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null)
    vi.mocked(authService.login).mockResolvedValue(user)
    vi.mocked(authService.register).mockResolvedValue(user)
    vi.mocked(authService.logout).mockResolvedValue(undefined)
  })

  it("restores the user from the server and removes private queries on logout", async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(user)
    const client = renderApp("/account")
    client.setQueryData(["private-data"], { owner: "previous account" })
    expect(await screen.findByRole("heading", { name: "Your account" })).toBeInTheDocument()
    expect(screen.getByText("Test Reader")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }))
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(client.getQueryData(["private-data"])).toBeUndefined()
    expect(authService.logout).toHaveBeenCalledTimes(1)
  })

  it("waits for session restoration before redirecting a protected route", async () => {
    let resolve: ((value: User) => void) | undefined
    vi.mocked(authService.getCurrentUser).mockReturnValue(new Promise<User>((done) => { resolve = done }))
    renderApp("/account")
    expect(screen.getByText("Checking your session…")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Sign in" })).not.toBeInTheDocument()
    await act(async () => { resolve?.(user) })
    expect(await screen.findByRole("heading", { name: "Your account" })).toBeInTheDocument()
  })

  it("shows a retry state rather than treating an unavailable server as a guest", async () => {
    vi.mocked(authService.getCurrentUser).mockRejectedValueOnce(new ApiRequestError("Server unavailable", 503))
    renderApp("/account")
    expect(await screen.findByRole("heading", { name: "We could not check your session" })).toBeInTheDocument()
    vi.mocked(authService.getCurrentUser).mockResolvedValue(user)
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByRole("heading", { name: "Your account" })).toBeInTheDocument()
  })

  it("validates registration and asks the newly registered user to log in", async () => {
    renderApp("/register")
    await screen.findByRole("heading", { name: "Create account" })
    await userEvent.click(screen.getByRole("button", { name: "Create account" }))
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true")
    expect(authService.register).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText("Display name"), "Test Reader")
    await userEvent.type(screen.getByLabelText("Email"), "reader@example.com")
    await userEvent.type(screen.getByLabelText("Password"), "A long test passphrase")
    await userEvent.click(screen.getByRole("button", { name: "Create account" }))
    expect(await screen.findByText("Account created. Sign in with your email and password.")).toBeInTheDocument()
    expect(authService.login).not.toHaveBeenCalled()
    expect(authService.register).toHaveBeenCalledTimes(1)
  })

  it("clears private data when a session check discovers expiration or another account", async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(user)
    const client = renderApp("/account")
    await screen.findByRole("heading", { name: "Your account" })
    client.setQueryData(["private-data"], { owner: user.id })
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null)
    await act(async () => { await client.invalidateQueries({ queryKey: ["auth", "me"] }) })
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(client.getQueryData(["private-data"])).toBeUndefined()
  })

  it("shows invalid credentials without retrying and signs in on explicit resubmission", async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(new ApiRequestError("Email or password is incorrect", 401, "INVALID_CREDENTIALS"))
    const client = renderApp("/login")
    await screen.findByRole("heading", { name: "Sign in" })
    client.setQueryData(["private-data"], { owner: "old user" })
    await userEvent.type(screen.getByLabelText("Email"), "reader@example.com")
    await userEvent.type(screen.getByLabelText("Password"), "A long test passphrase")
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect")
    await waitFor(() => expect(authService.login).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))
    expect(await screen.findByRole("heading", { name: "Your account" })).toBeInTheDocument()
    expect(client.getQueryData(["private-data"])).toBeUndefined()
  })
})
