'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

const createClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

export function QueryProvider({ children }) {
  const [client] = useState(createClient)
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  )
}
