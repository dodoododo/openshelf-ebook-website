import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getCurrentUser } from "@/services/authService"
import type { User } from "@/types/auth"

export const currentUserKey = ["auth", "me"] as const

export function useCurrentUser() {
  const client = useQueryClient()
  return useQuery({
    queryKey: currentUserKey,
    queryFn: async ({ signal }) => {
      const user = await getCurrentUser(signal)
      const previousUser = client.getQueryData<User | null>(currentUserKey)
      if (previousUser && previousUser.id !== user?.id) {
        const privateQueries = { predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[0] !== "auth" }
        await client.cancelQueries(privateQueries)
        client.removeQueries(privateQueries)
      }
      return user
    },
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}
