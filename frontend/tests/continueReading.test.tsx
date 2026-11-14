import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, it, vi } from "vitest"
import { ContinueReadingSection } from "@/components/books/ContinueReadingSection"
import { getContinueReading } from "@/services/readingProgressService"
import type { ContinueReadingItem, ContinueReadingPage } from "@/types/readingProgress"

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "reader-one" } }) }))
vi.mock("@/services/readingProgressService", () => ({ getContinueReading: vi.fn() }))
beforeEach(() => vi.clearAllMocks())
const item: ContinueReadingItem = {
  book: { id: "book-a", title: "A private book", author: "Author", description: "", visibility: "PRIVATE", createdAt: "", updatedAt: "", file: { id: "file-a", version: 1, originalFilename: "book.pdf", contentType: "application/pdf", sizeBytes: 100, sha256: "", pageCount: 5, createdAt: "" } },
  progress: { bookId: "book-a", bookFileId: "file-a", fileVersion: 1, currentPage: 4, furthestPage: 5, totalPages: 5, progressPercentage: 80, lastReadAt: "2026-11-14T00:00:00Z", createdAt: "", updatedAt: "" },
}
const response = (data: ContinueReadingItem[], page = 0): ContinueReadingPage => ({ success: true, data, timestamp: "", pagination: { page, size: 6, totalPages: 2, totalElements: 7, isLast: page === 1 } })
function mount() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><ContinueReadingSection /></MemoryRouter></QueryClientProvider>)
}

it("shows an accessible loading skeleton and a clear empty state", async () => {
  let release!: (value: ContinueReadingPage) => void
  vi.mocked(getContinueReading).mockReturnValue(new Promise((yes) => { release = yes }))
  mount()
  expect(screen.getByRole("status")).toHaveTextContent("Loading reading progress")
  release(response([]))
  expect(await screen.findByText("Your next chapter starts here.")).toBeInTheDocument()
})

it("shows real progress, resume links, and independent page navigation", async () => {
  vi.mocked(getContinueReading).mockImplementation(async (page = 0) => response([{ ...item, book: { ...item.book, title: page === 0 ? "A private book" : "An older book" } }], page))
  mount()
  expect(await screen.findByText("Page 4 of 5 · 80%")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Resume A private book" })).toHaveAttribute("href", "/read/book-a")
  await userEvent.click(screen.getByRole("button", { name: "Next" }))
  expect(await screen.findByRole("link", { name: "Resume An older book" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled()
  expect(getContinueReading).toHaveBeenLastCalledWith(1, expect.any(AbortSignal))
})

it("reports failures and retries without substituting fake progress", async () => {
  vi.mocked(getContinueReading).mockRejectedValueOnce(new Error("Service unavailable")).mockResolvedValueOnce(response([]))
  mount()
  expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable")
  await userEvent.click(screen.getByRole("button", { name: "Retry reading progress" }))
  await waitFor(() => expect(screen.getByText("Your next chapter starts here.")).toBeInTheDocument())
})
