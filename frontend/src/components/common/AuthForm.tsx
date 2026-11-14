import { useRef, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import type { RegisterRequest } from "@/types/auth"
import { toApiError } from "@/utils/apiErrors"
import { validateAuth } from "@/utils/authValidation"
import { Brand } from "@/components/layout/Brand"
import { ThemeToggle } from "@/components/common/ThemeToggle"
import { Input } from "@/components/ui/input"

export function AuthForm({ registration = false, notice, onSubmit }: {
  registration?: boolean
  notice?: string
  onSubmit: (values: RegisterRequest) => Promise<void>
}) {
  const { isPending } = useAuth()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState("")
  const errorSummary = useRef<HTMLParagraphElement>(null)
  const label = registration ? "Create account" : "Sign in"

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return
    const form = event.currentTarget
    const data = new FormData(form)
    const values = {
      email: String(data.get("email") || "").trim(),
      password: String(data.get("password") || ""),
      displayName: String(data.get("displayName") || "").trim(),
    }
    const validation = validateAuth(values, registration)
    setErrors(validation)
    setSubmitError("")
    if (Object.keys(validation).length > 0) {
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(validation)[0]}"]`)?.focus()
      return
    }
    try {
      await onSubmit(values)
    } catch (error) {
      const failure = toApiError(error)
      setErrors(Object.fromEntries(failure.details.map((issue) => [issue.field, issue.issue])))
      setSubmitError(failure.message)
      requestAnimationFrame(() => errorSummary.current?.focus())
    }
  }

  const inputClass = "mt-1"
  return (
    <main className="auth-page">
      <div className="auth-header"><Brand /><ThemeToggle /></div>
      <div className="auth-content">
        <p>A good story starts here.</p>
        <Card>
          <CardHeader>
            <h1>{label}</h1>
            <CardDescription>{registration ? "Create your OpenShelf account to get started." : "Welcome back. Sign in to your account."}</CardDescription>
          </CardHeader>
          <CardContent>
            {notice && <p role="status" className="mb-4 rounded-md bg-secondary p-3 text-sm text-success">{notice}</p>}
            {submitError && <p ref={errorSummary} tabIndex={-1} role="alert" className="mb-4 rounded-md bg-error-surface p-3 text-sm text-error-foreground">{submitError}</p>}
            <form onSubmit={submit} noValidate className="space-y-4" aria-busy={isPending}>
              {registration && <div>
                <label htmlFor="displayName" className="text-sm font-medium">Display name</label>
                <Input id="displayName" name="displayName" autoComplete="nickname" required maxLength={80}
                  className={inputClass} disabled={isPending} aria-invalid={!!errors.displayName}
                  aria-describedby={errors.displayName ? "displayName-error" : undefined} />
                {errors.displayName && <p id="displayName-error" className="mt-1 text-sm text-error-foreground">{errors.displayName}</p>}
              </div>}
              <div>
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
                  required maxLength={254} className={inputClass} disabled={isPending} aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined} />
                {errors.email && <p id="email-error" className="mt-1 text-sm text-error-foreground">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Input id="password" name="password" type="password" autoComplete={registration ? "new-password" : "current-password"}
                  required className={inputClass} disabled={isPending} aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : registration ? "password-hint" : undefined} />
                {errors.password ? <p id="password-error" className="mt-1 text-sm text-error-foreground">{errors.password}</p>
                  : registration && <p id="password-hint" className="mt-1 text-xs text-muted-foreground">Use 15–128 characters. Spaces and Unicode are welcome.</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Please wait…" : label}</Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {registration ? "Already have an account? " : "New to OpenShelf? "}
              <Link className="font-medium text-primary underline underline-offset-4" to={registration ? "/login" : "/register"}>
                {registration ? "Sign in" : "Create account"}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
