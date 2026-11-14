import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"

afterEach(cleanup)

Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn((query: string) => ({
  matches: false, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
})) })
window.scrollTo = vi.fn()
HTMLElement.prototype.scrollIntoView = vi.fn()
HTMLElement.prototype.hasPointerCapture = () => false
HTMLElement.prototype.releasePointerCapture = () => {}
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
