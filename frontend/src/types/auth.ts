export interface User {
  id: string
  email: string
  displayName: string
  role: "ROLE_USER" | "ROLE_ADMIN"
  createdAt: string
  updatedAt: string
}

export interface LoginRequest { email: string; password: string }
export interface RegisterRequest extends LoginRequest { displayName: string }
export interface CsrfToken { headerName: string; token: string }
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error"

export interface AuthContextValue {
  user: User | null | undefined
  status: AuthStatus
  error: string | null
  isPending: boolean
  login: (request: LoginRequest) => Promise<User>
  register: (request: RegisterRequest) => Promise<User>
  logout: () => Promise<void>
  retrySession: () => void
}
