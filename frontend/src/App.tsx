import { BrowserRouter } from "react-router-dom"
import { QueryProvider } from "@/providers/QueryProvider"
import { AppRoutes } from "@/routes"
import { AuthProvider } from "@/providers/AuthProvider"
import { ThemeProvider } from "@/providers/ThemeProvider"

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </QueryProvider>
    </ThemeProvider>
  )
}
